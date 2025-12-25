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

export class CreateUnitDto {
  @ApiProperty({ example: 101 })
  @IsInt()
  @Min(1)
  legacyAdminId!: number;

  @ApiProperty({ example: 5001 })
  @IsInt()
  @Min(1)
  legacyBuildingId!: number;

  @ApiProperty({ example: 'Legacy Building A', required: false })
  @IsOptional()
  @IsString()
  buildingName?: string;

  @ApiProperty({ enum: UnitType })
  @IsEnum(UnitType)
  unitType!: UnitType;

  @ApiProperty({ example: '12A' })
  @IsString()
  @MinLength(1)
  unitNumber!: string;

  @ApiProperty({ example: 'B1' })
  @IsString()
  @MinLength(1)
  floorNumber!: string;

  @ApiProperty({ enum: OwnershipType })
  @IsEnum(OwnershipType)
  ownershipType!: OwnershipType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  furnished?: boolean;

  @ApiProperty({ required: false, example: 1200 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  areaSize?: number;

  @ApiProperty({ required: false, enum: AreaUnit })
  @IsOptional()
  @IsEnum(AreaUnit)
  areaUnit?: AreaUnit;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfRooms?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfBedrooms?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfBathrooms?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  kitchen?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  balcony?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerCnicOrId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  @Matches(/^[0-9+\-\s]+$/)
  ownerContactNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  electricityMeterNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gasMeterNumber?: string;

  @ApiProperty({ required: false, enum: WaterConnectionType })
  @IsOptional()
  @IsEnum(WaterConnectionType)
  waterConnectionType?: WaterConnectionType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyRent?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maintenanceCharges?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  securityDeposit?: number;

  @ApiProperty({ required: false, default: 'PKR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parkingSlotNumber?: string;

  @ApiProperty({ required: false, enum: ParkingType })
  @IsOptional()
  @IsEnum(ParkingType)
  parkingType?: ParkingType;

}
