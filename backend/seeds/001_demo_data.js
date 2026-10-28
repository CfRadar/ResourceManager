'use strict';

/**
 * seeds/001_demo_data.js
 *
 * Inserts representative demo data for local development and UI testing.
 *
 * ⚠ ALL DATA IN THIS FILE IS FICTIONAL / DEMO ONLY.
 *    Spec §0: All demo records carry "demo": true in their relevant API responses.
 *    This seed is IDEMPOTENT — it uses `onConflict('id').ignore()` so re-running
 *    is safe.
 *
 * Seed order follows FK dependency:
 *   users → institutions → institution_memberships → facilities → resources → resource_policies
 *
 * Passwords are bcrypt hashes of the string shown in comments.
 * Use these accounts ONLY in local development.
 */

const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 10; // lower than production for faster seeding

// ─── Stable IDs (avoids duplicates on re-run) ─────────────────────────────────

const IDS = {
  // Institutions
  instA: '11111111-0000-4000-a000-000000000001',
  instB: '11111111-0000-4000-a000-000000000002',

  // Facilities
  facA:  '22222222-0000-4000-a000-000000000001',
  facB:  '22222222-0000-4000-a000-000000000002',

  // Users
  uAdmin:      '33333333-0000-4000-a000-000000000001',
  uOwner:      '33333333-0000-4000-a000-000000000002',
  uManager:    '33333333-0000-4000-a000-000000000003',
  uRequester:  '33333333-0000-4000-a000-000000000004',
  uRequester2: '33333333-0000-4000-a000-000000000005',

  // Resources
  res3dPrinter: '44444444-0000-4000-a000-000000000001',
  resLaser:     '44444444-0000-4000-a000-000000000002',
  resConf:      '44444444-0000-4000-a000-000000000003',
};

/** @param {import('knex').Knex} knex */
exports.seed = async (knex) => {
  // ── Users ──────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Demo@1234', BCRYPT_ROUNDS);

  await knex('users').insert([
    {
      id:             IDS.uAdmin,
      email:          'admin@demo.rm',
      password_hash:  passwordHash,
      name:           'Demo Admin',
      platform_role:  'ADMIN',
      email_verified: true,
      status:         'ACTIVE',
    },
    {
      id:             IDS.uOwner,
      email:          'owner@demo.rm',
      password_hash:  passwordHash,
      name:           'Lab Owner',
      platform_role:  'OWNER',
      email_verified: true,
      status:         'ACTIVE',
    },
    {
      id:             IDS.uManager,
      email:          'manager@demo.rm',
      password_hash:  passwordHash,
      name:           'Facility Manager',
      platform_role:  'MANAGER',
      email_verified: true,
      status:         'ACTIVE',
    },
    {
      id:             IDS.uRequester,
      email:          'alice@demo.rm',
      password_hash:  passwordHash,
      name:           'Alice Requester',
      platform_role:  'REQUESTER',
      email_verified: true,
      status:         'ACTIVE',
    },
    {
      id:             IDS.uRequester2,
      email:          'bob@demo.rm',
      password_hash:  passwordHash,
      name:           'Bob Requester',
      platform_role:  'REQUESTER',
      email_verified: true,
      status:         'ACTIVE',
    },
  ]).onConflict('id').ignore();

  // ── Institutions ──────────────────────────────────────────────────────────
  await knex('institutions').insert([
    {
      id:       IDS.instA,
      name:     'Demo University of Science',
      type:     'UNIVERSITY',
      verified: true,
      city:     'Bangalore',
      address:  '1 University Road, Bangalore 560001',
    },
    {
      id:       IDS.instB,
      name:     'Demo Innovation Hub',
      type:     'INNOVATION_HUB',
      verified: true,
      city:     'Hyderabad',
      address:  '42 Innovation Park, Hyderabad 500032',
    },
  ]).onConflict('id').ignore();

  // ── Institution Memberships ────────────────────────────────────────────────
  await knex('institution_memberships').insert([
    { id: knex.raw('gen_random_uuid()'), user_id: IDS.uAdmin,      institution_id: IDS.instA, role: 'ADMIN',     status: 'ACTIVE' },
    { id: knex.raw('gen_random_uuid()'), user_id: IDS.uOwner,      institution_id: IDS.instA, role: 'OWNER',     status: 'ACTIVE' },
    { id: knex.raw('gen_random_uuid()'), user_id: IDS.uManager,    institution_id: IDS.instA, role: 'MANAGER',   status: 'ACTIVE' },
    { id: knex.raw('gen_random_uuid()'), user_id: IDS.uRequester,  institution_id: IDS.instA, role: 'REQUESTER', status: 'ACTIVE' },
    { id: knex.raw('gen_random_uuid()'), user_id: IDS.uRequester2, institution_id: IDS.instB, role: 'REQUESTER', status: 'ACTIVE' },
  ]).onConflict(['user_id', 'institution_id']).ignore();

  // ── Facilities ────────────────────────────────────────────────────────────
  await knex('facilities').insert([
    {
      id:             IDS.facA,
      institution_id: IDS.instA,
      name:           'Fabrication Lab A',
      address:        'Building 3, Demo University',
      lat:            12.9716,
      lng:            77.5946,
      timezone:       'Asia/Kolkata',
      working_hours:  JSON.stringify({
        mon: [{ open: '08:00', close: '20:00' }],
        tue: [{ open: '08:00', close: '20:00' }],
        wed: [{ open: '08:00', close: '20:00' }],
        thu: [{ open: '08:00', close: '20:00' }],
        fri: [{ open: '08:00', close: '18:00' }],
        sat: [],
        sun: [],
      }),
      geofence_radius_meters: 100,
    },
    {
      id:             IDS.facB,
      institution_id: IDS.instB,
      name:           'Hub Prototyping Space',
      address:        'Block B, Innovation Park',
      lat:            17.3850,
      lng:            78.4867,
      timezone:       'Asia/Kolkata',
      working_hours:  JSON.stringify({
        mon: [{ open: '09:00', close: '21:00' }],
        tue: [{ open: '09:00', close: '21:00' }],
        wed: [{ open: '09:00', close: '21:00' }],
        thu: [{ open: '09:00', close: '21:00' }],
        fri: [{ open: '09:00', close: '19:00' }],
        sat: [{ open: '10:00', close: '15:00' }],
        sun: [],
      }),
      geofence_radius_meters: 150,
    },
  ]).onConflict('id').ignore();

  // ── Resources ─────────────────────────────────────────────────────────────
  await knex('resources').insert([
    {
      id:           IDS.res3dPrinter,
      facility_id:  IDS.facA,
      name:         'FDM 3D Printer — Ender 5 Pro',
      category:     '3D Printing',
      description:  'Creality Ender 5 Pro FDM printer. Suitable for PLA, PETG, and flexible filaments.',
      specs:        JSON.stringify({ buildVolume: '220×220×300mm', layerResolution: '0.1mm', nozzle: '0.4mm' }),
      capabilities: ['FDM', 'PLA', 'PETG', 'TPU'],
      visibility:   'PUBLIC',
      risk_level:   'LOW',
      status:       'ACTIVE',
      created_by:   IDS.uOwner,
    },
    {
      id:           IDS.resLaser,
      facility_id:  IDS.facA,
      name:         'CO₂ Laser Cutter — 60W',
      category:     'Laser Cutting',
      description:  '60 W CO₂ laser cutter for acrylic, wood, leather, and paper.',
      specs:        JSON.stringify({ power: '60W', bedSize: '600×400mm', maxThickness: '10mm' }),
      capabilities: ['CO2_LASER', 'ACRYLIC', 'WOOD', 'LEATHER'],
      visibility:   'INSTITUTION',
      risk_level:   'HIGH',
      status:       'ACTIVE',
      created_by:   IDS.uOwner,
    },
    {
      id:           IDS.resConf,
      facility_id:  IDS.facB,
      name:         'Conference Room Beta',
      category:     'Meeting Space',
      description:  '12-seat meeting room with projector and whiteboard.',
      specs:        JSON.stringify({ capacity: 12, projector: true, whiteboard: true }),
      capabilities: ['PROJECTOR', 'WHITEBOARD', 'VIDEO_CONF'],
      visibility:   'NETWORK',
      risk_level:   'LOW',
      status:       'ACTIVE',
      created_by:   IDS.uAdmin,
    },
  ]).onConflict('id').ignore();

  // ── Resource Policies ─────────────────────────────────────────────────────
  await knex('resource_policies').insert([
    {
      id:             knex.raw('gen_random_uuid()'),
      resource_id:    IDS.res3dPrinter,
      policy_version: 1,
      is_current:     true,
      updated_by:     IDS.uOwner,
      policy_data:    JSON.stringify({
        accessModes:        ['INDEPENDENT', 'SUPERVISED'],
        advanceBookingDays: 14,
        maxDurationHours:   4,
        dailyLimitHours:    8,
        weeklyLimitHours:   20,
        minBookingMinutes:  30,
        requiresInduction:  true,
        inductionTopic:     'FDM Safety and Filament Handling',
        requiresDocuments:  [],
        cancellationPolicy: { noticePeriodHours: 2, lateFeeDemoTokens: 5 },
        eligibilityRules:   [{ type: 'TRAINING_REQUIRED', trainingName: 'FDM Induction' }],
        pricingModel:       'FREE',
      }),
    },
    {
      id:             knex.raw('gen_random_uuid()'),
      resource_id:    IDS.resLaser,
      policy_version: 1,
      is_current:     true,
      updated_by:     IDS.uOwner,
      policy_data:    JSON.stringify({
        accessModes:        ['SUPERVISED', 'STAFF_SERVICE'],
        advanceBookingDays: 7,
        maxDurationHours:   2,
        dailyLimitHours:    4,
        weeklyLimitHours:   8,
        minBookingMinutes:  60,
        requiresInduction:  true,
        inductionTopic:     'Laser Safety Certification',
        requiresDocuments:  [{ templateName: 'Safety Agreement', expires: false }],
        cancellationPolicy: { noticePeriodHours: 24, lateFeeDemoTokens: 20 },
        eligibilityRules:   [
          { type: 'TRAINING_REQUIRED', trainingName: 'Laser Safety Certification' },
          { type: 'DOCUMENT_REQUIRED', documentTemplate: 'Safety Agreement' },
        ],
        pricingModel:       'DEMO_TOKEN',
        demoTokenCostPerHour: 50,
      }),
    },
    {
      id:             knex.raw('gen_random_uuid()'),
      resource_id:    IDS.resConf,
      policy_version: 1,
      is_current:     true,
      updated_by:     IDS.uAdmin,
      policy_data:    JSON.stringify({
        accessModes:        ['INDEPENDENT'],
        advanceBookingDays: 30,
        maxDurationHours:   8,
        dailyLimitHours:    8,
        weeklyLimitHours:   40,
        minBookingMinutes:  30,
        requiresInduction:  false,
        requiresDocuments:  [],
        cancellationPolicy: { noticePeriodHours: 1, lateFeeDemoTokens: 0 },
        eligibilityRules:   [],
        pricingModel:       'FREE',
      }),
    },
  ]).onConflict(['resource_id', 'policy_version']).ignore();

  console.log('[seed] Demo data inserted (001_demo_data). All data is fictional.');
};
