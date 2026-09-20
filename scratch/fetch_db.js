import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

async function main() {
  const result = {};

  const usersSnap = await getDocs(collection(db, 'users'));
  result.users = [];
  usersSnap.forEach(d => result.users.push({ id: d.id, ...d.data() }));

  const membersSnap = await getDocs(collection(db, 'members'));
  result.members = [];
  membersSnap.forEach(d => result.members.push({ id: d.id, ...d.data() }));

  const minSnap = await getDocs(collection(db, 'ministries'));
  result.ministries = [];
  minSnap.forEach(d => result.ministries.push({ id: d.id, ...d.data() }));

  const minMemSnap = await getDocs(collection(db, 'ministry_members'));
  result.ministry_members = [];
  minMemSnap.forEach(d => result.ministry_members.push({ id: d.id, ...d.data() }));

  fs.writeFileSync('./scratch/db_dump.json', JSON.stringify(result, null, 2));
  console.log("Successfully wrote dump to scratch/db_dump.json");
  console.log(`Users: ${result.users.length}, Members: ${result.members.length}, Ministries: ${result.ministries.length}, Ministry Members: ${result.ministry_members.length}`);

  process.exit(0);
}

main().catch(console.error);
