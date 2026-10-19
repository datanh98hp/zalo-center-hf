import { Body, Controller, Get, Post, Req, UseGuards, ConflictException } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/auth.types';
import { hashPassword } from '../auth/security';
class CreateEmployeeDto { @IsEmail() email!: string; @IsString() displayName!: string; @IsString() @MinLength(12) temporaryPassword!: string; }
@Controller('employees') @UseGuards(AuthGuard, RolesGuard) @Roles('OWNER','ADMIN','MANAGER')
export class EmployeesController {
  constructor(private prisma: PrismaService) {}
  @Get() async list(@Req() req: AuthRequest) {
    return this.prisma.user.findMany({ where: { tenantId: req.user!.tenantId }, select: { id:true,email:true,displayName:true,role:true,isActive:true,createdAt:true }, orderBy: { createdAt:'desc' } });
  }
  @Post() async create(@Body() dto: CreateEmployeeDto, @Req() req: AuthRequest) {
    const email = dto.email.toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { tenantId_email: { tenantId: req.user!.tenantId, email } } });
    if (exists) throw new ConflictException('Email already exists in this workspace');
    const passwordHash = await hashPassword(dto.temporaryPassword);
    return this.prisma.user.create({ data: { tenantId:req.user!.tenantId,email,displayName:dto.displayName,passwordHash,role:'AGENT' }, select: { id:true,email:true,displayName:true,role:true,isActive:true,createdAt:true } });
  }
}
