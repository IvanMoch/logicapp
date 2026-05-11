import { PrismaClient, MovementType } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.batchLocation.deleteMany();
  await prisma.movementDetail.deleteMany();
  await prisma.movement.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.location.deleteMany();

  // Create Products
  const products = await Promise.all([
    prisma.product.create({ data: { sku: 'SEM-M-01', name: 'Semilla de Maíz Híbrido 25kg', category: 'Semillas', minStockLevel: 50, description: 'Saco de semillas de maíz amarillo' } }),
    prisma.product.create({ data: { sku: 'FER-U-01', name: 'Fertilizante Urea 46% 50kg', category: 'Fertilizantes', minStockLevel: 100, description: 'Saco de Urea agrícola' } }),
    prisma.product.create({ data: { sku: 'PES-G-01', name: 'Pesticida Glifosato 1L', category: 'Agroquímicos', minStockLevel: 20, description: 'Herbicida de amplio espectro' } }),
    prisma.product.create({ data: { sku: 'ALI-G-01', name: 'Alimento Ganado Lechero 40kg', category: 'Nutrición Animal', minStockLevel: 200, description: 'Saco de alimento balanceado' } }),
    prisma.product.create({ data: { sku: 'SEM-S-01', name: 'Semilla de Soya 20kg', category: 'Semillas', minStockLevel: 30, description: 'Saco de semillas de soya' } })
  ]);

  // Create Locations
  const locations = await Promise.all([
    prisma.location.create({ data: { zone: 'Sector A', block: 'Pasillo 1', level: 'Nivel 1', capacity: 1000 } }),
    prisma.location.create({ data: { zone: 'Sector A', block: 'Pasillo 1', level: 'Nivel 2', capacity: 1000 } }),
    prisma.location.create({ data: { zone: 'Sector A', block: 'Pasillo 2', level: 'Nivel 1', capacity: 1000 } }),
    prisma.location.create({ data: { zone: 'Sector B', block: 'Pasillo 3', level: 'Nivel 1', capacity: 500 } }), // Agroquímicos
  ]);

  // Date Helpers
  const today = new Date();
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
  const nextMonth = new Date(today); nextMonth.setMonth(today.getMonth() + 1);
  const nextYear = new Date(today); nextYear.setFullYear(today.getFullYear() + 1);
  const lastWeek = new Date(today); lastWeek.setDate(today.getDate() - 7);

  // Create Batches
  const batches = await Promise.all([
    prisma.batch.create({ data: { productId: products[0].id, batchCode: 'L-MAIZ-2026', expirationDate: nextYear, initialQuantity: 500, currentQuantity: 450 } }),
    prisma.batch.create({ data: { productId: products[1].id, batchCode: 'L-UREA-001', expirationDate: nextYear, initialQuantity: 1000, currentQuantity: 1000 } }),
    prisma.batch.create({ data: { productId: products[2].id, batchCode: 'L-GLIF-WARN', expirationDate: nextWeek, initialQuantity: 100, currentQuantity: 30 } }), // Expiring soon!
    prisma.batch.create({ data: { productId: products[3].id, batchCode: 'L-ALIM-005', expirationDate: nextMonth, initialQuantity: 800, currentQuantity: 600 } }),
    prisma.batch.create({ data: { productId: products[4].id, batchCode: 'L-SOYA-100', expirationDate: nextYear, initialQuantity: 200, currentQuantity: 150 } }),
  ]);

  // Assign Batches to Locations
  await Promise.all([
    prisma.batchLocation.create({ data: { batchId: batches[0].id, locationId: locations[0].id, quantity: 450 } }),
    prisma.batchLocation.create({ data: { batchId: batches[1].id, locationId: locations[1].id, quantity: 1000 } }),
    prisma.batchLocation.create({ data: { batchId: batches[2].id, locationId: locations[3].id, quantity: 30 } }), // Agroquímicos in Sector B
    prisma.batchLocation.create({ data: { batchId: batches[3].id, locationId: locations[2].id, quantity: 600 } }),
    prisma.batchLocation.create({ data: { batchId: batches[4].id, locationId: locations[0].id, quantity: 150 } }),
  ]);

  // Create Historical Movements (Inputs and Outputs)
  // 1. Initial Input
  await prisma.movement.create({
    data: {
      type: MovementType.IN,
      date: lastWeek,
      referenceDoc: 'FAC-1001',
      details: {
        create: [
          { batchId: batches[0].id, quantity: 500 },
          { batchId: batches[1].id, quantity: 1000 },
          { batchId: batches[2].id, quantity: 100 },
          { batchId: batches[3].id, quantity: 800 },
          { batchId: batches[4].id, quantity: 200 },
        ]
      }
    }
  });

  // 2. Output 1 (Sale)
  await prisma.movement.create({
    data: {
      type: MovementType.OUT,
      date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      referenceDoc: 'GUI-5001',
      details: {
        create: [
          { batchId: batches[0].id, quantity: 50 },
          { batchId: batches[3].id, quantity: 200 },
        ]
      }
    }
  });

  // 3. Output 2 (Sale)
  await prisma.movement.create({
    data: {
      type: MovementType.OUT,
      date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      referenceDoc: 'GUI-5002',
      details: {
        create: [
          { batchId: batches[2].id, quantity: 70 },
          { batchId: batches[4].id, quantity: 50 },
        ]
      }
    }
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
