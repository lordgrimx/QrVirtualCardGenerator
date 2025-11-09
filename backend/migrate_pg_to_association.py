"""
PostgreSQL Database Migration Script: Convert membershipType and role to association field
This script migrates the database schema from membership_type and role columns
to a single association column for member records.
"""

import os
from dotenv import load_dotenv
import psycopg2
from psycopg2 import sql

# Load environment variables
load_dotenv()

def get_db_connection():
    """Create PostgreSQL database connection"""
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "qrvirtualcard")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
    
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        return conn
    except Exception as e:
        print(f"ERROR: Database connection failed: {e}")
        return None

def migrate_database():
    """Migrate database schema to use association instead of membership_type and role"""
    
    try:
        conn = get_db_connection()
        if not conn:
            print("ERROR: Could not connect to database.")
            return
        
        cursor = conn.cursor()
        
        # Check if members table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'members'
            );
        """)
        
        if not cursor.fetchone()[0]:
            print("ERROR: Members table not found. Creating fresh database...")
            conn.close()
            # Import and run database creation
            from database import engine, Base
            Base.metadata.create_all(bind=engine)
            print("SUCCESS: Fresh database created with new schema!")
            return
        
        # Check if old columns exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'members'
        """)
        
        columns = [row[0] for row in cursor.fetchall()]
        
        has_membership_type = 'membership_type' in columns
        has_role = 'role' in columns
        has_association = 'association' in columns
        
        print(f"Current columns: membership_type={has_membership_type}, role={has_role}, association={has_association}")
        
        if not has_membership_type and not has_role and has_association:
            print("SUCCESS: Database already migrated. No action needed.")
            conn.close()
            return
        
        if has_association:
            print("WARNING: Association column already exists.")
        else:
            print("Adding association column...")
            cursor.execute("""
                ALTER TABLE members 
                ADD COLUMN association VARCHAR(100)
            """)
            print("SUCCESS: Association column added.")
        
        # Set default value for association if it's NULL
        if has_membership_type or has_role:
            print("Setting default association for existing records...")
            cursor.execute("""
                UPDATE members 
                SET association = 'izmir-elazig'
                WHERE association IS NULL
            """)
            affected = cursor.rowcount
            print(f"SUCCESS: Default association set for {affected} existing records.")
        
        # Make association column NOT NULL after setting defaults
        if not has_association or (has_membership_type or has_role):
            print("Making association column NOT NULL...")
            cursor.execute("""
                ALTER TABLE members 
                ALTER COLUMN association SET NOT NULL
            """)
            print("SUCCESS: Association column set to NOT NULL.")
        
        # Remove old columns if they exist
        if has_membership_type:
            print("Dropping membership_type column...")
            cursor.execute("""
                ALTER TABLE members 
                DROP COLUMN IF EXISTS membership_type
            """)
            print("SUCCESS: membership_type column removed.")
        
        if has_role:
            print("Dropping role column...")
            cursor.execute("""
                ALTER TABLE members 
                DROP COLUMN IF EXISTS role
            """)
            print("SUCCESS: role column removed.")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("\n" + "="*60)
        print("SUCCESS: Migration completed successfully!")
        print("   - Association field is now active")
        print("   - Old membership_type and role fields removed")
        print("   - All existing records preserved")
        print("="*60)
        
    except Exception as e:
        print(f"\nERROR: Migration failed: {e}")
        import traceback
        traceback.print_exc()
        if 'conn' in locals() and conn:
            conn.rollback()
            conn.close()
        raise

if __name__ == "__main__":
    print("Starting PostgreSQL database migration...")
    print("="*60)
    migrate_database()

