import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
async function bootstrap(){
 const app=await NestFactory.create(AppModule,{rawBody:true});
 app.setGlobalPrefix('api');
 const webOrigins=(process.env.WEB_ORIGIN??'http://localhost:3000,http://127.0.0.1:3000').split(',').map(origin=>origin.trim()).filter(Boolean);
 app.enableCors({origin:webOrigins,credentials:true});
 app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
 const port=Number(process.env.PORT??4000); await app.listen(port,'0.0.0.0');
 console.log(`Zalo Center API listening on port ${port}`);
}
void bootstrap();
