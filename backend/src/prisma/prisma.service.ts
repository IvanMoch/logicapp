import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({ 
      adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })) 
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
