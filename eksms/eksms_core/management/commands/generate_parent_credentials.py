from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from eksms_core.models import Parent
import secrets
import string
import csv
from datetime import datetime


class Command(BaseCommand):
    help = 'Generate and display login credentials for parent accounts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Generate credentials for all parents without passwords',
        )
        parser.add_argument(
            '--export',
            type=str,
            help='Export credentials to CSV file',
        )
        parser.add_argument(
            '--parent-ids',
            type=str,
            help='Comma-separated parent IDs to generate credentials for',
        )

    def handle(self, *args, **options):
        credentials = []
        
        if options['all']:
            parents = Parent.objects.filter(user__username__isnull=False)
        elif options['parent_ids']:
            parent_ids = [int(pid.strip()) for pid in options['parent_ids'].split(',')]
            parents = Parent.objects.filter(id__in=parent_ids)
        else:
            parents = Parent.objects.filter(user__username__isnull=False)[:5]  # First 5 by default
        
        if not parents.exists():
            raise CommandError('No parents found')
        
        for parent in parents:
            password = self.generate_strong_password()
            parent.user.set_password(password)
            parent.user.save()
            
            credentials.append({
                'id': parent.id,
                'name': parent.user.get_full_name(),
                'username': parent.user.username,
                'email': parent.user.email or 'N/A',
                'phone': parent.phone_number,
                'password': password,
                'relationship': parent.relationship,
            })
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Generated credentials for {parent.user.get_full_name()}'
                )
            )
        
        # Display credentials
        self.display_credentials(credentials)
        
        # Export to CSV if requested
        if options['export']:
            self.export_to_csv(credentials, options['export'])
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Credentials exported to {options["export"]}'
                )
            )

    def display_credentials(self, credentials):
        """Display credentials in a formatted table"""
        self.stdout.write('\n' + '='*100)
        self.stdout.write(self.style.SUCCESS('PARENT LOGIN CREDENTIALS'))
        self.stdout.write('='*100)
        
        for cred in credentials:
            self.stdout.write(f'\nParent ID: {cred["id"]}')
            self.stdout.write(f'Name: {cred["name"]}')
            self.stdout.write(f'Username: {cred["username"]}')
            self.stdout.write(f'Email: {cred["email"]}')
            self.stdout.write(f'Phone: {cred["phone"]}')
            self.stdout.write(f'Relationship: {cred["relationship"]}')
            self.stdout.write(
                self.style.WARNING(f'Password: {cred["password"]}')
            )
            self.stdout.write('-'*100)
        
        self.stdout.write(
            self.style.WARNING(
                '\n⚠ NOTE: Share these credentials securely with parents. '
                'Advise them to change their password on first login.\n'
            )
        )

    def export_to_csv(self, credentials, filename):
        """Export credentials to CSV file"""
        with open(filename, 'w', newline='') as csvfile:
            fieldnames = ['id', 'name', 'username', 'email', 'phone', 'password', 'relationship']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            for cred in credentials:
                writer.writerow(cred)

    @staticmethod
    def generate_strong_password(length=12):
        """Generate a strong random password"""
        characters = string.ascii_letters + string.digits + '!@#$%^&*'
        password = ''.join(secrets.choice(characters) for _ in range(length))
        return password
