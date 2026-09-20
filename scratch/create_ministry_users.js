import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

function cleanForFirestore(obj) {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj.filter((item) => item !== undefined).map((item) => (typeof item === 'object' && item !== null ? cleanForFirestore(item) : item));
  }
  const cleaned = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
        cleaned[key] = cleanForFirestore(val);
      } else {
        cleaned[key] = val;
      }
    }
  });
  return cleaned;
}

async function main() {
  console.log("Reading database...");
  const usersSnap = await getDocs(collection(db, 'users'));
  const existingUsers = [];
  usersSnap.forEach(d => existingUsers.push({ id: d.id, ...d.data() }));

  const membersSnap = await getDocs(collection(db, 'members'));
  const members = [];
  membersSnap.forEach(d => members.push({ id: d.id, ...d.data() }));

  function findExistingUser(member) {
    const memberFirst = (member.firstName || '').trim().toLowerCase();
    const memberLast = (member.lastName || '').trim().toLowerCase();
    const memberFull = `${memberFirst} ${memberLast}`.trim();
    const memberEmail = (member.email || '').trim().toLowerCase();
    const memberPhone = (member.phone || '').replace(/\D/g, '');

    for (const u of [...existingUsers, ...newUsersCreated]) {
      const uUsername = (u.username || '').trim().toLowerCase();
      const uName = (u.name || '').trim().toLowerCase();
      const uEmail = (u.email || '').trim().toLowerCase();
      const uPhone = (u.phone || '').replace(/\D/g, '');

      if (memberEmail && uEmail && memberEmail === uEmail) return u;
      if (memberPhone && uPhone && memberPhone.length >= 7 && (memberPhone.includes(uPhone) || uPhone.includes(memberPhone))) return u;
      if (memberFirst && uUsername === memberFirst) return u;
      if (uName && (uName === memberFirst || uName === memberFull)) return u;
    }
    return null;
  }

  const communionMembers = [];
  const otherMinistryMembers = [];

  for (const m of members) {
    const teams = m.ministryTeams || [];
    if (teams.length === 0) continue;
    const isCommunion = teams.some(t => t.toLowerCase().includes('communion'));
    if (isCommunion) {
      communionMembers.push(m);
    } else {
      otherMinistryMembers.push(m);
    }
  }

  const newUsersCreated = [];

  // Helper to create SaaSUser object
  function createSaaSUserForMember(member, ministryGroup) {
    const firstNameClean = member.firstName.trim();
    const username = firstNameClean.toLowerCase();
    const password = `${username}@123`;
    const userId = `user-mem-${member.id.replace(/[^a-zA-Z0-9-]/g, '')}`;
    
    const userObj = {
      id: userId,
      church_id: member.church_id || member.churchId || 'church-1',
      churchId: member.church_id || member.churchId || 'church-1',
      username: username,
      password: password,
      name: firstNameClean, // First name as profile name
      email: member.email || '',
      phone: member.phone || '',
      role: 'Member',
      designation: `${ministryGroup} Member`,
      status: 'Active',
      createdAt: new Date().toISOString(),
      assignedBy: 'System Auto-Creation'
    };

    return userObj;
  }

  console.log("\n=== STEP 1: PROCESSING COMMUNION MINISTRY MEMBERS ===");
  for (const m of communionMembers) {
    const existing = findExistingUser(m);
    if (existing) {
      console.log(`[SKIP] Member ${m.firstName} ${m.lastName} already has user account: ${existing.username}`);
    } else {
      const newUser = createSaaSUserForMember(m, 'Communion Ministry');
      newUsersCreated.push(newUser);
      console.log(`[CREATE - COMMUNION] Username: ${newUser.username} | Password: ${newUser.password} | Name: ${newUser.name} | Email: ${newUser.email} | Phone: ${newUser.phone}`);
    }
  }

  console.log("\n=== STEP 2: PROCESSING OTHER MINISTRY MEMBERS ===");
  for (const m of otherMinistryMembers) {
    const existing = findExistingUser(m);
    if (existing) {
      console.log(`[SKIP] Member ${m.firstName} ${m.lastName} already has user account: ${existing.username}`);
    } else {
      const mainTeam = (m.ministryTeams && m.ministryTeams[0]) || 'Ministry';
      const newUser = createSaaSUserForMember(m, mainTeam);
      newUsersCreated.push(newUser);
      console.log(`[CREATE - OTHER] Username: ${newUser.username} | Password: ${newUser.password} | Name: ${newUser.name} | Email: ${newUser.email} | Phone: ${newUser.phone}`);
    }
  }

  console.log(`\nTotal New Users Created: ${newUsersCreated.length}`);

  // Perform Firestore Writes
  console.log("\nWriting new users to Firestore database...");
  for (const u of newUsersCreated) {
    await setDoc(doc(db, 'users', u.id), cleanForFirestore(u), { merge: true });
    console.log(`Saved user ${u.username} (${u.id}) to Firestore.`);
  }

  // Write new users summary to scratch file
  fs.writeFileSync('./scratch/created_users.json', JSON.stringify(newUsersCreated, null, 2));
  console.log("Finished writing all users to Firestore and scratch/created_users.json.");

  process.exit(0);
}

main().catch(console.error);
