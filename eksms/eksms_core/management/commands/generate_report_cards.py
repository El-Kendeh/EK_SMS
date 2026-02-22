"""
Management command to generate report cards for a term.

Usage:
    python manage.py generate_report_cards --term=1 --year="2024-2025"
    python manage.py generate_report_cards --term=1 --publish  # Also publish them
"""

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count, Avg, Sum
from django.utils import timezone
from eksms_core.models import Term, AcademicYear, ReportCard, Student, Grade, ClassRanking


class Command(BaseCommand):
    help = 'Generate report cards for students in a specific term'

    def add_arguments(self, parser):
        parser.add_argument(
            '--term',
            type=int,
            required=True,
            help='Term ID for which to generate report cards',
        )
        parser.add_argument(
            '--year',
            type=str,
            required=True,
            help='Academic year (e.g., "2024-2025")',
        )
        parser.add_argument(
            '--publish',
            action='store_true',
            help='Automatically publish generated report cards',
        )

    def handle(self, *args, **options):
        try:
            term = Term.objects.get(id=options['term'])
            academic_year = AcademicYear.objects.get(name=options['year'])
        except Term.DoesNotExist:
            raise CommandError(f'Term with ID {options["term"]} does not exist')
        except AcademicYear.DoesNotExist:
            raise CommandError(f'Academic year "{options["year"]}" does not exist')

        self.stdout.write(
            self.style.WARNING(
                f'Generating report cards for {term.name} - {academic_year.name}...\n'
            )
        )

        # Get all students with grades in this term
        students_with_grades = Student.objects.filter(
            grades__term=term
        ).distinct()

        created_count = 0
        updated_count = 0
        errors = 0

        for student in students_with_grades:
            try:
                # Get student's grades for this term
                grades = Grade.objects.filter(
                    student=student,
                    term=term
                )

                if not grades.exists():
                    continue

                # Calculate summary stats
                grade_stats = grades.aggregate(
                    total_subjects=Count('subject'),
                    average_score=Avg('total_score'),
                )

                # Get class ranking
                ranking = ClassRanking.objects.filter(
                    student=student,
                    term=term,
                    classroom=student.classroom
                ).first()

                # Get classroom students count with grades in this term
                classroom_size = Student.objects.filter(
                    classroom=student.classroom,
                    grades__term=term
                ).distinct().count()

                # Create or update report card
                report_card, created = ReportCard.objects.update_or_create(
                    student=student,
                    term=term,
                    academic_year=academic_year,
                    defaults={
                        'classroom': student.classroom,
                        'total_subjects': grade_stats['total_subjects'] or 0,
                        'average_score': grade_stats['average_score'] or 0,
                        'class_rank': ranking.rank if ranking else None,
                        'class_size': classroom_size,
                        'generated_by': None,  # Could be set to current user
                    }
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

                # Publish if requested
                if options['publish'] and not report_card.is_published:
                    report_card.mark_published()

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'✗ Error generating report card for {student.user.get_full_name()}: {str(e)}'
                    )
                )
                errors += 1
                continue

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Report card generation complete!\n'
                f'Created: {created_count}\n'
                f'Updated: {updated_count}\n'
                f'Errors: {errors}'
            )
        )

        if options['publish']:
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ All report cards have been published and are visible to parents'
                )
            )
