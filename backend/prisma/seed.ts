import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Super Admin
  const adminPassword = await bcrypt.hash('Admin@Legacy2024!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@legacyhomes.co.ke' },
    update: {},
    create: {
      fullName: 'System Administrator',
      email: 'admin@legacyhomes.co.ke',
      phone: '0700000001',
      passwordHash: adminPassword,
      role: 'SUPER_ADMIN',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      accountNumber: 'LH-ADMIN-001',
    },
  });
  console.log('✅ Super Admin created:', admin.email);

  // Removed Billing Officer creation as per requirement for single Super Admin

  // Create sample residents
  const residents = [
    { name: 'John Kamau', email: 'john.kamau@example.com', phone: '0712345678', house: 'A1' },
    { name: 'Mary Wanjiku', email: 'mary.wanjiku@example.com', phone: '0723456789', house: 'A2' },
    { name: 'Peter Ochieng', email: 'peter.ochieng@example.com', phone: '0734567890', house: 'B1' },
  ];

  const residentPassword = await bcrypt.hash('Resident@2024!', 12);

  for (let i = 0; i < residents.length; i++) {
    const r = residents[i];
    const resident = await prisma.user.upsert({
      where: { email: r.email },
      update: {},
      create: {
        fullName: r.name,
        email: r.email,
        phone: r.phone,
        passwordHash: residentPassword,
        role: 'RESIDENT',
        accountStatus: 'ACTIVE',
        emailVerified: true,
        houseNumber: r.house,
        accountNumber: `LH${Date.now()}${i}`,
      },
    });

    // Create meter for each resident
    await prisma.meter.upsert({
      where: { meterNumber: `MTR-${r.house}-001` },
      update: {},
      create: {
        meterNumber: `MTR-${r.house}-001`,
        meterSerial: `SN-${r.house}-${Date.now()}${i}`,
        residentId: resident.id,
        houseNumber: r.house,
        installationDate: new Date('2024-01-01'),
        previousReading: 100 + i * 50,
        currentReading: 100 + i * 50,
        status: 'ACTIVE',
      },
    });

    console.log(`✅ Resident created: ${r.name} (House ${r.house})`);
  }

  // System settings
  await prisma.systemSetting.upsert({
    where: { key: 'unit_rate' },
    update: {},
    create: { key: 'unit_rate', value: '250' },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'estate_name' },
    update: {},
    create: { key: 'estate_name', value: 'Legacy Homes' },
  });

  console.log('✅ System settings created');
  console.log('🎉 Database seeded successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('  Super Admin: admin@legacyhomes.co.ke / Admin@Legacy2024!');

  console.log('  Residents: [email] / Resident@2024!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
