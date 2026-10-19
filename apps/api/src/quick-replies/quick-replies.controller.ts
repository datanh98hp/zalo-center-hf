import { Body, Controller, Get, Post, Patch, Param, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/auth.types';
class QuickReplyDto { @IsString() @MinLength(1) title!:string; @IsString() @MinLength(1) body!:string; @IsOptional() @IsString() category?:string; }
class UpdateQuickReplyDto { @IsOptional() @IsString() @MinLength(1) title?:string; @IsOptional() @IsString() @MinLength(1) body?:string; @IsOptional() @IsString() category?:string; }
@Controller('quick-replies') @UseGuards(AuthGuard)
export class QuickRepliesController {
 constructor(private prisma:PrismaService){}
 @Get() list(@Req() req:AuthRequest){ return this.prisma.quickReply.findMany({where:{tenantId:req.user!.tenantId,isActive:true},orderBy:[{category:'asc'},{title:'asc'}]}); }
 @Post() @UseGuards(RolesGuard) @Roles('OWNER','ADMIN','MANAGER') create(@Body() dto:QuickReplyDto,@Req() req:AuthRequest){return this.prisma.quickReply.create({data:{tenantId:req.user!.tenantId,title:dto.title,body:dto.body,category:dto.category,createdBy:req.user!.sub}});}
 @Patch(':id') @UseGuards(RolesGuard) @Roles('OWNER','ADMIN','MANAGER') async update(@Param('id') id:string,@Body() dto:UpdateQuickReplyDto,@Req() req:AuthRequest){
  const row=await this.prisma.quickReply.findFirst({where:{id,tenantId:req.user!.tenantId}}); if(!row) throw new NotFoundException('Quick reply not found');
  return this.prisma.quickReply.update({where:{id},data:{...(dto.title!==undefined?{title:dto.title}:{}),...(dto.body!==undefined?{body:dto.body}:{}),...(dto.category!==undefined?{category:dto.category}:{})}});
 }
}
