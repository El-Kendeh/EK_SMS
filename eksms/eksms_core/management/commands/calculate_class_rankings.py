"""
Management command to calculate and update class rankings based on grades.

Usage:
    python manage.py calculate_class_rankings           # Calculate all
    python manage.py calculate_class_rankings --term=1  # For Term 1
    python manage.py calculate_class_rankings --year=2024-2025  # For academic year
"""

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Sum, Avg, Count, F
from eksms_core.models import Grade, ClassRanking, Term, AcademicYear, ClassRoom


class Command(BaseCommand):
    help = 'Recalculate class rankings based on current grades'

    def add_arguments(self, parser):
        parser.add_argument(
            '--term',
            type=int,
            help='Specific term ID to calculate rankings for',
        )
        parser.add_argument(
            '--year',
            type=str,
            help='Specific academic year name (e.g., "2024-2025")',
        )
        parser.add_argument(
            '--classroom',
            type=int,
            help='Specific classroom ID to calculate rankings for',
        )

    def handle(self, *args, **options):
        # Build filter kwargs
        filters = {}
        
        if options['term']:
            try:
                term = Term.objects.get(id=options['term'])
                filters['term'] = term
                term_str = f"Term: {term.name}"
            except Term.DoesNotExist:
                raise CommandError(f'Term with ID {options["term"]} does not exist')
        else:
            term_str = "All Terms"

        if options['year']:
            try:
                year = AcademicYear.objects.get(name=options['year'])
                term_str += f", Year: {year.name}"
            except AcademicYear.DoesNotExist:
                raise CommandError(f'Academic year "{options["year"]}" does not exist')
        
        if options['classroom']:
            try:
                classroom = ClassRoom.objects.get(id=options['classroom'])
                term_str += f", Classroom: {classroom.name}"
            except ClassRoom.DoesNotExist:
                raise CommandError(f'Classroom with ID {options["classroom"]} does not exist')

        # Get all unique (classroom, term) combinations
        if filters:
            grade_combos = Grade.objects.filter(**filters).values('classroom__id', 'term__id').distinct()
        else:
            # Get all grades and extract unique classroom+term combos
            grade_combos = Grade.objects.values('classroom__id', 'term__id').distinct()

        total_rankings = 0
        
        for combo in grade_combos:
            classroom_id = combo['classroom__id']
            term_id = combo['term__id']
            
            # Get classroom and term objects
            try:
                classroom = ClassRoom.objects.get(id=classroom_id)
                term = Term.objects.get(id=term_id)
            except (ClassRoom.DoesNotExist, Term.DoesNotExist):
                continue
            
            # Get all students in this classroom with grades in this term
            grades_in_term = Grade.objects.filter(
                student__classroom=classroom,
                term=term
            ).values('student').annotate(
                total_score=Sum('total_score'),
                num_subjects=Count('subject'),
                avg_score=Avg('total_score')
            ).order_by('-total_score')

            # Calculate ranks
            rankings_created = 0
            rankings_updated = 0
            
            for rank, grade_data in enumerate(grades_in_term, start=1):
                student_id = grade_data['student']
                total_points = grade_data['total_score'] or 0
                average_score = grade_data['avg_score'] or 0
                
                ranking, created = ClassRanking.objects.update_or_create(
                    student_id=student_id,
                    term=term,
                    classroom=classroom,
                    defaults={
                        'rank': rank,
                        'total_points': total_points,
                        'average_score': average_score,
                    }
                )
                
                if created:
                    rankings_created += 1
                else:
                    rankings_updated += 1
                
                total_rankings += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ {classroom.name} - {term.name}: '
                    f'{rankings_created} created, {rankings_updated} updated'
                )
            )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Ranking calculation complete! ({term_str})\n'
                f'Total rankings processed: {total_rankings}'
            )
        )
