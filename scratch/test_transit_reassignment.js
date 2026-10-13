/**
 * TEST SUITE: IN-TRANSIT REASSIGNMENT & WALKING TAG SELECTION
 * Tests:
 * 1. Clicking an in-transit crew member from crew manifest selects them for reassignment
 * 2. Does NOT cancel transit or revert position on click
 * 3. Reassignment banner shows "CLICK TO ASSIGN {NAME}" and "STANDBY"
 * 4. Reassigning in-transit officer to another station re-routes them cleanly (even while paused)
 * 5. Clicking CANCEL on banner keeps transit intact and closes banner
 * 6. Clicking STANDBY on banner unassigns the in-transit officer
 * 7. Clicking walking in-transit tag on ship cutaway triggers reassignment selection
 * 8. Clicking room occupant walking tag triggers reassignment selection
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Setup mock DOM environment
global.window = global;
global.Image = class { constructor() {} };

const elements = {};
function createMockElement(id, tag = 'div') {
    const classSet = new Set();
    const el = {
        id,
        tag,
        style: {},
        textContent: '',
        innerText: '',
        innerHTML: '',
        children: [],
        get className() { return Array.from(classSet).join(' '); },
        set className(val) {
            classSet.clear();
            if (val) val.trim().split(/\s+/).forEach(c => classSet.add(c));
        },
        classList: {
            add: function(...cls) { cls.forEach(c => classSet.add(c)); },
            remove: function(...cls) { cls.forEach(c => classSet.delete(c)); },
            contains: function(c) { return classSet.has(c); },
            toggle: function(c) { if (classSet.has(c)) classSet.delete(c); else classSet.add(c); }
        },
        appendChild: function(c) { this.children.push(c); return c; },
        insertBefore: function(c) { this.children.unshift(c); return c; },
        remove: function() {},
        addEventListener: function(event, handler) { this[`_on_${event}`] = handler; },
        click: function(e) { if (this._on_click) this._on_click(e || { stopPropagation: () => {} }); },
        querySelectorAll: function() { return []; },
        querySelector: function() { return null; },
        getAttribute: function(attr) { return this[attr] || null; },
        setAttribute: function(attr, val) { this[attr] = val; },
        getContext: () => ({ drawImage: () => {}, fillRect: () => {}, clearRect: () => {} })
    };
    elements[id] = el;
    return el;
}

global.document = {
    createElement: function(tag) {
        return createMockElement(`anon-${Math.random()}`, tag);
    },
    getElementById: function(id) {
        return elements[id] || createMockElement(id);
    },
    querySelector: function(sel) {
        return null;
    },
    querySelectorAll: function() { return []; }
};

global.performance = { now: () => Date.now() };
global.SoundFX = {
    playKeyClick: () => {},
    playCrisisAlert: () => {},
    playLaunchAlert: () => {}
};

// Initialize elements expected by phase2Bridge
createMockElement('phase2-ship-container');
createMockElement('dispatch-banner');
createMockElement('dispatch-banner-text');
createMockElement('dispatch-btn-unassign');
createMockElement('phase2-crew-roster');
createMockElement('phase2-security-console');
createMockElement('phase2-manifest-counter');

const bridgeCode = fs.readFileSync(path.join(__dirname, '../src/phase2/phase2Bridge.js'), 'utf8');
eval(bridgeCode);

const flightEngineCode = fs.readFileSync(path.join(__dirname, '../src/phase2/flightEngine.js'), 'utf8');
eval(flightEngineCode);

console.log("====================================================");
console.log("🧪 TESTING IN-TRANSIT REASSIGNMENT & WALKING TAGS");
console.log("====================================================");

const bridge = window.Phase2Bridge;
const engine = window.FlightEngine;

bridge.crew = [
    {
        name: "Elena Rostova",
        roleTitle: "Lead Reactor Engineer",
        station: "Reactor",
        currentRoom: "reactor",
        previousRoom: null,
        transitTarget: null,
        transitRemaining: 0,
        hp: 100,
        eng: 100,
        isDead: false,
        status: "ASSIGNED: REACTOR",
        avatarIndex: 0
    },
    {
        name: "Marcus Vance",
        roleTitle: "Senior Systems Specialist",
        station: "Reactor",
        currentRoom: "reactor",
        previousRoom: null,
        transitTarget: null,
        transitRemaining: 0,
        hp: 100,
        eng: 100,
        isDead: false,
        status: "ASSIGNED: REACTOR",
        avatarIndex: 1
    }
];
engine.crew = bridge.crew;
engine.speedMultiplier = 0; // Paused mode!

// -------------------------------------------------------------
// TEST 1: Initial Dispatch to Cockpit puts officer in transit
// -------------------------------------------------------------
console.log("\nTest 1: Initial Dispatch puts officer in transit");
bridge.selectOfficer(0); // Select Elena
assert.strictEqual(bridge.selectedOfficerIndex, 0);

bridge.dispatchOfficer(0, 'cockpit');
assert.strictEqual(bridge.crew[0].currentRoom, null);
assert.strictEqual(bridge.crew[0].transitTarget, 'cockpit');
assert.ok(bridge.crew[0].transitRemaining > 0, "Officer must have transitRemaining > 0");
assert.strictEqual(bridge.crew[0].previousRoom, 'reactor');
assert.strictEqual(bridge.selectedOfficerIndex, null, "Dispatch should clear selection");
console.log(`  Elena dispatched to Cockpit: transitRemaining = ${bridge.crew[0].transitRemaining}s, previousRoom = ${bridge.crew[0].previousRoom}`);
console.log("  ✅ TEST 1 PASSED: Initial dispatch sets transit state.");

// -------------------------------------------------------------
// TEST 2: Clicking In-Transit Crewmate in Manifest SELECTS instead of cancelling
// -------------------------------------------------------------
console.log("\nTest 2: Clicking in-transit crewmate selects for reassignment");
bridge.selectOfficer(0); // Click Elena again while she is in transit!

assert.strictEqual(bridge.selectedOfficerIndex, 0, "Officer must be selected for reassignment");
assert.strictEqual(bridge.crew[0].transitTarget, 'cockpit', "Transit target must NOT be reverted on click");
assert.ok(bridge.crew[0].transitRemaining > 0, "Transit remaining must NOT be zeroed out on click");
assert.strictEqual(bridge.crew[0].currentRoom, null, "Current room must still be null (not reverted to reactor)");

const bannerTextEl = document.getElementById('dispatch-banner-text');
const unassignBtnEl = document.getElementById('dispatch-btn-unassign');
console.log(`  Banner Text: "${bannerTextEl.textContent}" (Expected: "CLICK TO ASSIGN ELENA ROSTOVA")`);
console.log(`  Unassign Button: "${unassignBtnEl.textContent}" (Expected: "STANDBY")`);
assert.strictEqual(bannerTextEl.textContent, "CLICK TO ASSIGN ELENA ROSTOVA");
assert.strictEqual(unassignBtnEl.textContent, "STANDBY");
assert.ok(!unassignBtnEl.classList.contains('hidden'), "STANDBY button must be visible for in-transit officer");
console.log("  ✅ TEST 2 PASSED: In-transit officer selected for reassignment without reverting; concise banner text verified.");

// -------------------------------------------------------------
// TEST 3: Reassigning In-Transit Officer to a New Compartment (e.g. Hydroponics)
// -------------------------------------------------------------
console.log("\nTest 3: Reassigning in-transit officer to another compartment");
bridge.dispatchOfficer(0, 'hydroponics');

assert.strictEqual(bridge.selectedOfficerIndex, null, "Selection cleared after reassignment");
assert.strictEqual(bridge.crew[0].transitTarget, 'hydroponics', "Transit target updated to hydroponics");
assert.ok(bridge.crew[0].transitRemaining > 0, "Transit duration recalculated for new target");
assert.strictEqual(bridge.crew[0].previousRoom, 'reactor', "Original origin room preserved for continuity");
console.log(`  Elena successfully rerouted to Hydroponics: transitTarget = ${bridge.crew[0].transitTarget}, transitRemaining = ${bridge.crew[0].transitRemaining}s`);
console.log("  ✅ TEST 3 PASSED: In-transit officer cleanly re-routed to new destination.");

// -------------------------------------------------------------
// TEST 4: Clicking CANCEL on Banner preserves transit
// -------------------------------------------------------------
console.log("\nTest 4: Clicking CANCEL preserves in-transit state");
bridge.selectOfficer(0); // Select Elena again
assert.strictEqual(bridge.selectedOfficerIndex, 0);

bridge.cancelDispatch(); // User clicks CANCEL
assert.strictEqual(bridge.selectedOfficerIndex, null);
assert.strictEqual(bridge.crew[0].transitTarget, 'hydroponics', "Elena still en route to hydroponics");
assert.ok(bridge.crew[0].transitRemaining > 0, "Transit remaining untouched");
console.log("  ✅ TEST 4 PASSED: Cancel button dismisses reassignment mode without affecting transit.");

// -------------------------------------------------------------
// TEST 5: Clicking STANDBY on Banner unassigns in-transit officer
// -------------------------------------------------------------
console.log("\nTest 5: Clicking STANDBY unassigns in-transit officer");
bridge.selectOfficer(0);
bridge.unassignSelectedOfficer(); // User clicks STANDBY

assert.strictEqual(bridge.selectedOfficerIndex, null);
assert.strictEqual(bridge.crew[0].transitTarget, null);
assert.strictEqual(bridge.crew[0].transitRemaining, 0);
assert.strictEqual(bridge.crew[0].currentRoom, null);
assert.strictEqual(bridge.crew[0].status, 'UNASSIGNED');
console.log("  ✅ TEST 5 PASSED: STANDBY button cleanly unassigns in-transit officer.");

// -------------------------------------------------------------
// TEST 6: Clicking Walking Crewmate Tag in Compartment Triggers Selection
// -------------------------------------------------------------
console.log("\nTest 6: Clicking room occupant walking tag triggers reassignment");
// Place Marcus in reactor and verify renderRoomOccupants creates clickable token
bridge.crew[1].currentRoom = 'reactor';
bridge.crew[1].transitRemaining = 0;

// Setup room occupants container in mock DOM
createMockElement('occupants-reactor');
createMockElement('occupants-cockpit');
createMockElement('occupants-medbay');
createMockElement('occupants-sleepPods');
createMockElement('occupants-hydroponics');
createMockElement('occupants-o2bay');
createMockElement('occupants-brig');
createMockElement('occupants-workshop');

bridge.renderRoomOccupants();

const reactorContainer = document.getElementById('occupants-reactor');
const marcusToken = reactorContainer.children.find(c => c.id === 'token-officer-Marcus-Vance');
assert.ok(marcusToken, "Marcus token must exist in reactor container");

// Click Marcus token!
marcusToken.click();
assert.strictEqual(bridge.selectedOfficerIndex, 1, "Clicking Marcus walking tag must select Marcus for reassignment");
assert.strictEqual(bannerTextEl.textContent, "CLICK TO ASSIGN MARCUS VANCE");
console.log("  ✅ TEST 6 PASSED: Room occupant walking tag triggers reassignment on click.");

// -------------------------------------------------------------
// TEST 7: Clicking In-Transit Walking Tag Triggers Selection
// -------------------------------------------------------------
console.log("\nTest 7: Clicking in-transit walking tag triggers reassignment");
// Dispatch Marcus to brig
bridge.dispatchOfficer(1, 'brig');
assert.strictEqual(bridge.crew[1].transitTarget, 'brig');
assert.ok(bridge.crew[1].transitRemaining > 0);

bridge.renderRoomOccupants();
const brigContainer = document.getElementById('occupants-brig');
const inTransitToken = brigContainer.children.find(c => c.classList.contains('in-transit'));
assert.ok(inTransitToken, "In-transit token must exist under brig container");

// Click the in-transit walking tag!
inTransitToken.click();
assert.strictEqual(bridge.selectedOfficerIndex, 1, "Clicking in-transit tag must select officer for reassignment");
assert.strictEqual(bridge.crew[1].transitTarget, 'brig', "Transit must NOT be cancelled by clicking tag");
assert.strictEqual(bannerTextEl.textContent, "CLICK TO ASSIGN MARCUS VANCE");
console.log("  ✅ TEST 7 PASSED: In-transit walking tag triggers reassignment without cancelling transit.");

console.log("\n====================================================");
console.log("🎉 ALL 7 IN-TRANSIT REASSIGNMENT TESTS PASSED!");
console.log("====================================================");
