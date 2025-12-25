import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  AreaUnit,
  OwnershipType,
  ParkingType,
  UnitType,
  WaterConnectionType,
} from '@prisma/client';

export class UpdateUnitDto {
  @ApiProperty({ required: false, enum: UnitType })
  @IsOptional()
  @IsEnum(UnitType)
  unitType?: UnitType;

  @ApiProperty({ required: false, example: '12A' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  unitNumber?: string;

  @ApiProperty({ required: false, example: 'B1' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  floorNumber?: string;

  @ApiProperty({ required: false, enum: OwnershipType })
  @IsOptional()
  @IsEnum(OwnershipType)
  ownershipType?: OwnershipType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  furnished?: boolean | null;

  @ApiProperty({ required: false, example: 1200 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  areaSize?: number | null;

  @ApiProperty({ required: false, enum: AreaUnit })
  @IsOptional()
  @IsEnum(AreaUnit)
  areaUnit?: AreaUnit | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfRooms?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfBedrooms?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfBathrooms?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  kitchen?: boolean | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  balcony?: boolean | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerName?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerCnicOrId?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  @Matches(/^[0-9+\-\s]+$/)
  ownerContactNumber?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  electricityMeterNumber?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gasMeterNumber?: string | null;

  @ApiProperty({ required: false, enum: WaterConnectionType })
  @IsOptional()
  @IsEnum(WaterConnectionType)
  waterConnectionType?: WaterConnectionType | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyRent?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maintenanceCharges?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  securityDeposit?: number | null;

  @ApiProperty({ required: false, default: 'PKR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parkingSlotNumber?: string | null;

  @ApiProperty({ required: false, enum: ParkingType })
  @IsOptional()
  @IsEnum(ParkingType)
  parkingType?: ParkingType | null;
}
