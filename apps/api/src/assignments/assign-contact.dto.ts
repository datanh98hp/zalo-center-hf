import { IsOptional, IsString, MinLength } from 'class-validator';

export class AssignContactDto {
  @IsString() @MinLength(1) tenantId!: string;
  @IsString() @MinLength(1) contactId!: string;
  @IsString() @MinLength(1) employeeId!: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() idempotencyKey?: string;
}
