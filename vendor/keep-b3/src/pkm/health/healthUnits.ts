/**
 * Phase P54: Health Units & Explicit Conversions
 * 
 * Safe, unit-aware conversions with exact ratios.
 * Incompatible dimensions (e.g. kg to mmHg) will fail gracefully or return original.
 */

import { MeasurementUnit } from './healthTypes';

export interface ConvertedHealthValue {
  value: number;
  unit: string;
  originalValue: number;
  originalUnit: string;
  isConverted: boolean;
}

// Exact conversion constants
const LB_PER_KG = 2.20462262185;
const KG_PER_LB = 1 / LB_PER_KG;
const G_PER_OZ = 28.349523125;
const INCH_PER_CM = 1 / 2.54;
const CM_PER_INCH = 2.54;
const KM_PER_MILE = 1.609344;
const MILE_PER_KM = 1 / KM_PER_MILE;
const GLUCOSE_CONVERSION_FACTOR = 18.0182; // mg/dL = mmol/L * 18.0182

export type UnitDimension =
  | 'mass'
  | 'length'
  | 'distance'
  | 'temperature'
  | 'glucose'
  | 'blood_pressure'
  | 'heart_rate'
  | 'percentage'
  | 'energy'
  | 'time'
  | 'unknown';

export function getUnitDimension(unit: string): UnitDimension {
  const norm = unit.trim().toLowerCase();
  if (['kg', 'kilogram', 'kilograms', 'lb', 'lbs', 'pound', 'pounds', 'g', 'gram', 'grams', 'oz', 'ounce', 'ounces'].includes(norm)) {
    return 'mass';
  }
  if (['cm', 'centimeter', 'centimeters', 'in', 'inch', 'inches', 'm', 'meter', 'meters', 'ft', 'feet'].includes(norm)) {
    return 'length';
  }
  if (['km', 'kilometer', 'kilometers', 'mi', 'mile', 'miles'].includes(norm)) {
    return 'distance';
  }
  if (['celsius', '°c', 'c', 'fahrenheit', '°f', 'f'].includes(norm)) {
    return 'temperature';
  }
  if (['mg/dl', 'mg/100ml', 'mmol/l', 'mmol/liter'].includes(norm)) {
    return 'glucose';
  }
  if (['mmhg'].includes(norm)) {
    return 'blood_pressure';
  }
  if (['bpm', 'beats/min', 'beats per minute'].includes(norm)) {
    return 'heart_rate';
  }
  if (['%'].includes(norm)) {
    return 'percentage';
  }
  if (['kcal', 'calorie', 'calories', 'kj', 'kilojoules'].includes(norm)) {
    return 'energy';
  }
  if (['sec', 's', 'second', 'seconds', 'min', 'minute', 'minutes', 'h', 'hr', 'hour', 'hours'].includes(norm)) {
    return 'time';
  }
  return 'unknown';
}

export function areUnitsCompatible(unitA: string, unitB: string): boolean {
  if (unitA.trim().toLowerCase() === unitB.trim().toLowerCase()) return true;
  const dimA = getUnitDimension(unitA);
  const dimB = getUnitDimension(unitB);
  if (dimA === 'unknown' || dimB === 'unknown') return false;
  return dimA === dimB;
}

/**
 * Converts a numerical value from one unit to another within the same dimension.
 * If units are identical or incompatible, returns the original value.
 */
export function convertHealthUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
  decimals: number = 2
): ConvertedHealthValue {
  const normFrom = fromUnit.trim().toLowerCase();
  const normTo = toUnit.trim().toLowerCase();

  if (normFrom === normTo) {
    return {
      value,
      unit: toUnit,
      originalValue: value,
      originalUnit: fromUnit,
      isConverted: false,
    };
  }

  const dimFrom = getUnitDimension(fromUnit);
  const dimTo = getUnitDimension(toUnit);

  if (dimFrom !== dimTo || dimFrom === 'unknown') {
    return {
      value,
      unit: fromUnit,
      originalValue: value,
      originalUnit: fromUnit,
      isConverted: false,
    };
  }

  let converted = value;

  switch (dimFrom) {
    case 'mass': {
      // Base unit: kg
      let inKg = value;
      if (['lb', 'lbs', 'pound', 'pounds'].includes(normFrom)) inKg = value * KG_PER_LB;
      else if (['g', 'gram', 'grams'].includes(normFrom)) inKg = value / 1000;
      else if (['oz', 'ounce', 'ounces'].includes(normFrom)) inKg = (value * G_PER_OZ) / 1000;

      if (['kg', 'kilogram', 'kilograms'].includes(normTo)) converted = inKg;
      else if (['lb', 'lbs', 'pound', 'pounds'].includes(normTo)) converted = inKg * LB_PER_KG;
      else if (['g', 'gram', 'grams'].includes(normTo)) converted = inKg * 1000;
      else if (['oz', 'ounce', 'ounces'].includes(normTo)) converted = (inKg * 1000) / G_PER_OZ;
      break;
    }

    case 'length': {
      // Base unit: cm
      let inCm = value;
      if (['in', 'inch', 'inches'].includes(normFrom)) inCm = value * CM_PER_INCH;
      else if (['m', 'meter', 'meters'].includes(normFrom)) inCm = value * 100;
      else if (['ft', 'feet'].includes(normFrom)) inCm = value * 12 * CM_PER_INCH;

      if (['cm', 'centimeter', 'centimeters'].includes(normTo)) converted = inCm;
      else if (['in', 'inch', 'inches'].includes(normTo)) converted = inCm * INCH_PER_CM;
      else if (['m', 'meter', 'meters'].includes(normTo)) converted = inCm / 100;
      break;
    }

    case 'distance': {
      // Base unit: km
      let inKm = value;
      if (['mi', 'mile', 'miles'].includes(normFrom)) inKm = value * KM_PER_MILE;

      if (['km', 'kilometer', 'kilometers'].includes(normTo)) converted = inKm;
      else if (['mi', 'mile', 'miles'].includes(normTo)) converted = inKm * MILE_PER_KM;
      break;
    }

    case 'temperature': {
      const isFromC = ['celsius', '°c', 'c'].includes(normFrom);
      const isToF = ['fahrenheit', '°f', 'f'].includes(normTo);
      if (isFromC && isToF) {
        converted = (value * 9) / 5 + 32;
      } else if (!isFromC && !isToF) {
        converted = ((value - 32) * 5) / 9;
      }
      break;
    }

    case 'glucose': {
      const isFromMgDl = ['mg/dl', 'mg/100ml'].includes(normFrom);
      const isToMmol = ['mmol/l', 'mmol/liter'].includes(normTo);
      if (isFromMgDl && isToMmol) {
        converted = value / GLUCOSE_CONVERSION_FACTOR;
      } else if (!isFromMgDl && !isToMmol) {
        converted = value * GLUCOSE_CONVERSION_FACTOR;
      }
      break;
    }

    case 'energy': {
      const isFromKcal = ['kcal', 'calorie', 'calories'].includes(normFrom);
      const isToKj = ['kj', 'kilojoules'].includes(normTo);
      if (isFromKcal && isToKj) {
        converted = value * 4.184;
      } else if (!isFromKcal && !isToKj) {
        converted = value / 4.184;
      }
      break;
    }

    case 'time': {
      let inSec = value;
      if (['min', 'minute', 'minutes'].includes(normFrom)) inSec = value * 60;
      else if (['h', 'hr', 'hour', 'hours'].includes(normFrom)) inSec = value * 3600;

      if (['sec', 's', 'second', 'seconds'].includes(normTo)) converted = inSec;
      else if (['min', 'minute', 'minutes'].includes(normTo)) converted = inSec / 60;
      else if (['h', 'hr', 'hour', 'hours'].includes(normTo)) converted = inSec / 3600;
      break;
    }

    default:
      break;
  }

  const factor = Math.pow(10, decimals);
  const rounded = Math.round(converted * factor) / factor;

  return {
    value: rounded,
    unit: toUnit,
    originalValue: value,
    originalUnit: fromUnit,
    isConverted: true,
  };
}

export function formatHealthValue(
  value: number,
  unit: string,
  decimals: number = 1
): string {
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(value * factor) / factor;
  return `${rounded} ${unit}`;
}

export function formatBloodPressure(
  systolic: number,
  diastolic: number,
  pulse?: number
): string {
  if (pulse) {
    return `${systolic}/${diastolic} mmHg (${pulse} bpm)`;
  }
  return `${systolic}/${diastolic} mmHg`;
}
