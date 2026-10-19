import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { AssignmentService } from './assignment.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/auth.types';
class AssignDto { @IsString() @MinLength(1) contactId!:string; @IsString() @MinLength(1) employeeId!:string; @IsOptional() @IsString() reason?:string; }
@Controller('assignments') @UseGuards(AuthGuard,RolesGuard) @Roles('OWNER','ADMIN','MANAGER')
export class AssignmentsController { constructor(private assignments:AssignmentService){} @Post() assign(@Body() dto:AssignDto,@Req() req:AuthRequest){return this.assignments.assign({tenantId:req.user!.tenantId,contactId:dto.contactId,employeeId:dto.employeeId,assignedBy:req.user!.sub,reason:dto.reason});} }
