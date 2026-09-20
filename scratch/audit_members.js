import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('./scratch/db_dump.json', 'utf8'));

const users = dump.users;
const members = dump.members;

console.log("Existing Users Count:", users.length);
console.log("Existing Members Count:", members.length);

// Helper to check if a member already has a user account
function findExistingUser(member) {
  const memberFirst = (member.firstName || '').trim().toLowerCase();
  const memberLast = (member.lastName || '').trim().toLowerCase();
  const memberFull = `${memberFirst} ${memberLast}`.trim();
  const memberEmail = (member.email || '').trim().toLowerCase();
  const memberPhone = (member.phone || '').replace(/\D/g, '');

  for (const u of users) {
    const uUsername = (u.username || '').trim().toLowerCase();
    const uName = (u.name || '').trim().toLowerCase();
    const uEmail = (u.email || '').trim().toLowerCase();
    const uPhone = (u.phone || '').replace(/\D/g, '');

    // Check matching by email (if non-empty)
    if (memberEmail && uEmail && memberEmail === uEmail) {
      return u;
    }
    // Check matching by phone (if non-empty and at least 7 digits)
    if (memberPhone && uPhone && memberPhone.length >= 7 && (memberPhone.includes(uPhone) || uPhone.includes(memberPhone))) {
      return u;
    }
    // Check matching by username (if username matches member first name)
    if (memberFirst && uUsername === memberFirst) {
      return u;
    }
    // Check matching by name
    if (uName && (uName === memberFirst || uName === memberFull)) {
      return u;
    }
  }
  return null;
}

const communionMembers = [];
const otherMinistryMembers = [];
const noMinistryMembers = [];

for (const m of members) {
  const teams = m.ministryTeams || [];
  if (teams.length === 0) {
    noMinistryMembers.push(m);
    continue;
  }
  
  const isCommunion = teams.some(t => t.toLowerCase().includes('communion'));
  if (isCommunion) {
    communionMembers.push(m);
  } else {
    otherMinistryMembers.push(m);
  }
}

console.log(`\n=== 1. COMMUNION MINISTRY MEMBERS (${communionMembers.length}) ===`);
communionMembers.forEach(m => {
  const existing = findExistingUser(m);
  console.log(`- ${m.firstName} ${m.lastName} | Phone: "${m.phone}" | Email: "${m.email}" | Teams: ${JSON.stringify(m.ministryTeams)} | Existing User: ${existing ? `${existing.username} (${existing.name})` : 'NONE (SKIP=FALSE)'}`);
});

console.log(`\n=== 2. OTHER MINISTRY MEMBERS (${otherMinistryMembers.length}) ===`);
otherMinistryMembers.forEach(m => {
  const existing = findExistingUser(m);
  console.log(`- ${m.firstName} ${m.lastName} | Phone: "${m.phone}" | Email: "${m.email}" | Teams: ${JSON.stringify(m.ministryTeams)} | Existing User: ${existing ? `${existing.username} (${existing.name})` : 'NONE (SKIP=FALSE)'}`);
});

console.log(`\n=== 3. NO MINISTRY MEMBERS (${noMinistryMembers.length}) ===`);
noMinistryMembers.forEach(m => {
  console.log(`- ${m.firstName} ${m.lastName}`);
});
