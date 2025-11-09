"""
Database Migration Script: Convert membershipType and role to association field
This script migrates the database schema from membership_type and role columns
to a single association column for member records.
"""

import sqlite3
from pathlib import Path

def migrate_database():
    """Migrate database schema to use association instead of membership_type and role"""
    
    # Database path
    db_path = Path(__file__).parent / "qrvirtualcard.db"
    
    if not db_path.exists():
        print("❌ Database file not found. No migration needed.")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if old columns exist
        cursor.execute("PRAGMA table_info(members)")
        columns = [col[1] for col in cursor.fetchall()]
        
        has_membership_type = 'membership_type' in columns
        has_role = 'role' in columns
        has_association = 'association' in columns
        
        if not has_membership_type and not has_role and has_association:
            print("✅ Database already migrated. No action needed.")
            conn.close()
            return
        
        if has_association:
            print("⚠️ Association column already exists. Skipping column creation.")
        else:
            print("📝 Adding association column...")
            cursor.execute("""
                ALTER TABLE members 
                ADD COLUMN association VARCHAR(100)
            """)
            print("✅ Association column added.")
        
        # Set default value for association if it's NULL
        # We'll use a default value for existing records
        if has_membership_type or has_role:
            print("📝 Setting default association for existing records...")
            cursor.execute("""
                UPDATE members 
                SET association = 'izmir-elazig'
                WHERE association IS NULL
            """)
            print("✅ Default association set for existing records.")
        
        # Remove old columns if they exist
        if has_membership_type or has_role:
            print("📝 Creating backup table...")
            
            # Create new table with updated schema
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS members_new (
                    id INTEGER PRIMARY KEY,
                    full_name VARCHAR(255) NOT NULL,
                    membership_id VARCHAR(50) UNIQUE NOT NULL,
                    card_number VARCHAR(16) UNIQUE NOT NULL,
                    phone_number VARCHAR(20) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    address TEXT NOT NULL,
                    date_of_birth VARCHAR(10) NOT NULL,
                    emergency_contact VARCHAR(20) NOT NULL,
                    association VARCHAR(100) NOT NULL,
                    status VARCHAR(20) DEFAULT 'active',
                    profile_photo TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Copy data to new table
            print("📝 Copying data to new table...")
            cursor.execute("""
                INSERT INTO members_new 
                SELECT 
                    id, full_name, membership_id, card_number, phone_number, 
                    email, address, date_of_birth, emergency_contact, 
                    COALESCE(association, 'izmir-elazig') as association,
                    status, profile_photo, created_at, updated_at
                FROM members
            """)
            
            # Drop old table and rename new one
            print("📝 Replacing old table...")
            cursor.execute("DROP TABLE members")
            cursor.execute("ALTER TABLE members_new RENAME TO members")
            
            # Recreate indexes
            print("📝 Recreating indexes...")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_members_membership_id ON members(membership_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_members_email ON members(email)")
            
            print("✅ Old columns removed and table restructured.")
        
        conn.commit()
        conn.close()
        
        print("\n✅ Migration completed successfully!")
        print("   - Association field is now active")
        print("   - Old membership_type and role fields removed")
        print("   - All existing records preserved")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        raise

if __name__ == "__main__":
    print("🔄 Starting database migration...")
    print("=" * 60)
    migrate_database()
    print("=" * 60)

