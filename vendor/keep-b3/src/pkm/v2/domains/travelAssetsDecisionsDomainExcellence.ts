/**
 * PKM V2.13 — Travel, Assets & Decisions Excellence Engine
 *
 * Implements dedicated life operational domains:
 * - Travel: Distinct Trip Planning vs active on-the-ground Travel Mode, timezone-safe itineraries, offline documents
 * - Assets: Asset identity, warranties, maintenance schedules, service records, and loan tracking
 * - Decisions: Preserves historical reasoning, options, predictions, choices, and retrospective outcome learning
 */

import { crossDomainRelationEngine } from './crossDomainRelationEngine';

// ================= Travel Types =================

export type ReservationType = 'flight' | 'lodging' | 'transit' | 'car_rental' | 'activity' | 'restaurant';

export interface V2TravelReservation {
  id: string;
  tripId: string;
  type: ReservationType;
  title: string;
  provider: string;
  confirmationCode?: string;
  startDateTimeIso: string;
  endDateTimeIso?: string;
  destinationTimezone: string;
  location?: string;
  notes?: string;
}

export interface V2TripRecord {
  id: string;
  title: string;
  destination: string;
  startDateOnly: string;
  endDateOnly: string;
  status: 'planning' | 'active' | 'completed' | 'archived';
  timezone: string;
  offlinePackPrepared: boolean;
  notes?: string;
}

// ================= Asset Types =================

export interface V2MaintenanceRecord {
  id: string;
  assetId: string;
  performedDateOnly: string;
  serviceType: string;
  costCents?: number;
  providerOrSelf: string;
  notes?: string;
}

export interface V2AssetRecord {
  id: string;
  name: string;
  category: 'electronics' | 'vehicle' | 'appliance' | 'property' | 'tool' | 'other';
  serialNumber?: string;
  purchaseDateOnly?: string;
  purchasePriceCents?: number;
  warrantyExpirationDateOnly?: string;
  maintenanceIntervalMonths?: number;
  lastMaintenanceDateOnly?: string;
  loanedToPersonId?: string;
  loanedAtDateOnly?: string;
  expectedReturnDateOnly?: string;
  status: 'active' | 'loaned' | 'under_repair' | 'disposed';
}

// ================= Decision Types =================

export type DecisionStatus = 'open' | 'decided' | 'reviewed' | 'abandoned';

export interface V2DecisionOption {
  id: string;
  label: string;
  pros?: string[];
  cons?: string[];
}

export interface V2DecisionRecord {
  id: string;
  question: string;
  status: DecisionStatus;
  options?: V2DecisionOption[];
  chosenOptionId?: string;
  reasoning: string;
  predictedOutcome?: string;
  reviewDateOnly?: string;
  actualOutcome?: string;
  lessonsLearned?: string;
  decidedAt?: string;
  reviewedAt?: string;
  createdAt: string;
}

export class TravelAssetsDecisionsDomainExcellence {
  private trips = new Map<string, V2TripRecord>();
  private reservations = new Map<string, V2TravelReservation[]>(); // tripId -> reservations

  private assets = new Map<string, V2AssetRecord>();
  private maintenanceLogs = new Map<string, V2MaintenanceRecord[]>(); // assetId -> records

  private decisions = new Map<string, V2DecisionRecord>();

  // ================= Travel =================

  public saveTrip(trip: V2TripRecord): V2TripRecord {
    this.trips.set(trip.id, { ...trip });
    if (!this.reservations.has(trip.id)) {
      this.reservations.set(trip.id, []);
    }
    return trip;
  }

  public getTrip(id: string): V2TripRecord | undefined {
    return this.trips.get(id);
  }

  public getAllTrips(): V2TripRecord[] {
    return Array.from(this.trips.values());
  }

  public getActiveTrip(todayDateOnly: string): V2TripRecord | undefined {
    return Array.from(this.trips.values()).find(
      (t) => t.status === 'active' || (t.startDateOnly <= todayDateOnly && t.endDateOnly >= todayDateOnly)
    );
  }

  public addReservation(params: {
    tripId: string;
    type: ReservationType;
    title: string;
    provider: string;
    startDateTimeIso: string;
    endDateTimeIso?: string;
    destinationTimezone: string;
    confirmationCode?: string;
    location?: string;
  }): V2TravelReservation {
    const res: V2TravelReservation = {
      id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tripId: params.tripId,
      type: params.type,
      title: params.title,
      provider: params.provider,
      startDateTimeIso: params.startDateTimeIso,
      endDateTimeIso: params.endDateTimeIso,
      destinationTimezone: params.destinationTimezone,
      confirmationCode: params.confirmationCode,
      location: params.location,
    };

    const list = this.reservations.get(params.tripId) || [];
    list.push(res);
    list.sort((a, b) => a.startDateTimeIso.localeCompare(b.startDateTimeIso));
    this.reservations.set(params.tripId, list);

    // Register canonical cross-domain relation
    crossDomainRelationEngine.addRelation({
      sourceId: res.id,
      sourceType: 'reservation',
      targetId: params.tripId,
      targetType: 'itinerary',
      relationType: 'trip_has_reservation',
      label: `${params.type.toUpperCase()}: ${params.title}`,
    });

    return res;
  }

  public getTripItinerary(tripId: string): V2TravelReservation[] {
    return this.reservations.get(tripId) || [];
  }

  // ================= Assets =================

  public saveAsset(asset: V2AssetRecord): V2AssetRecord {
    this.assets.set(asset.id, { ...asset });
    if (!this.maintenanceLogs.has(asset.id)) {
      this.maintenanceLogs.set(asset.id, []);
    }

    if (asset.loanedToPersonId) {
      crossDomainRelationEngine.addRelation({
        sourceId: asset.id,
        sourceType: 'asset',
        targetId: asset.loanedToPersonId,
        targetType: 'person',
        relationType: 'asset_loaned_to_person',
        label: `Loaned: ${asset.name}`,
      });
    }

    return asset;
  }

  public getAsset(id: string): V2AssetRecord | undefined {
    return this.assets.get(id);
  }

  public getAllAssets(): V2AssetRecord[] {
    return Array.from(this.assets.values());
  }

  public recordMaintenance(params: {
    assetId: string;
    performedDateOnly: string;
    serviceType: string;
    costCents?: number;
    providerOrSelf: string;
    notes?: string;
  }): V2MaintenanceRecord {
    const rec: V2MaintenanceRecord = {
      id: `maint_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      assetId: params.assetId,
      performedDateOnly: params.performedDateOnly,
      serviceType: params.serviceType,
      costCents: params.costCents,
      providerOrSelf: params.providerOrSelf,
      notes: params.notes,
    };

    const list = this.maintenanceLogs.get(params.assetId) || [];
    list.unshift(rec);
    this.maintenanceLogs.set(params.assetId, list);

    const asset = this.assets.get(params.assetId);
    if (asset) {
      asset.lastMaintenanceDateOnly = params.performedDateOnly;
    }

    return rec;
  }

  public getMaintenanceRecords(assetId: string): V2MaintenanceRecord[] {
    return this.maintenanceLogs.get(assetId) || [];
  }

  public evaluateAssetAttention(todayDateOnly: string): Array<{
    assetId: string;
    assetName: string;
    reason: 'maintenance_due' | 'warranty_ending' | 'loan_return_due';
    details: string;
  }> {
    const items: Array<{
      assetId: string;
      assetName: string;
      reason: 'maintenance_due' | 'warranty_ending' | 'loan_return_due';
      details: string;
    }> = [];

    for (const asset of this.assets.values()) {
      // Check warranty
      if (asset.warrantyExpirationDateOnly && asset.warrantyExpirationDateOnly <= todayDateOnly) {
        items.push({
          assetId: asset.id,
          assetName: asset.name,
          reason: 'warranty_ending',
          details: `Warranty expired on ${asset.warrantyExpirationDateOnly}`,
        });
      }

      // Check loan return
      if (asset.status === 'loaned' && asset.expectedReturnDateOnly && asset.expectedReturnDateOnly <= todayDateOnly) {
        items.push({
          assetId: asset.id,
          assetName: asset.name,
          reason: 'loan_return_due',
          details: `Loan return expected on ${asset.expectedReturnDateOnly}`,
        });
      }
    }

    return items;
  }

  // ================= Decisions =================

  public saveDecision(decision: V2DecisionRecord): V2DecisionRecord {
    this.decisions.set(decision.id, { ...decision });
    return decision;
  }

  public getDecision(id: string): V2DecisionRecord | undefined {
    return this.decisions.get(id);
  }

  public getAllDecisions(): V2DecisionRecord[] {
    return Array.from(this.decisions.values());
  }

  public recordOutcome(params: {
    decisionId: string;
    actualOutcome: string;
    lessonsLearned?: string;
  }): boolean {
    const d = this.decisions.get(params.decisionId);
    if (!d) return false;
    d.actualOutcome = params.actualOutcome;
    d.lessonsLearned = params.lessonsLearned;
    d.status = 'reviewed';
    d.reviewedAt = new Date().toISOString();
    return true;
  }

  public clear(): void {
    this.trips.clear();
    this.reservations.clear();
    this.assets.clear();
    this.maintenanceLogs.clear();
    this.decisions.clear();
  }
}

export const travelAssetsDecisionsDomainExcellence = new TravelAssetsDecisionsDomainExcellence();
