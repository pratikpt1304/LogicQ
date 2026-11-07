import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";

const firebaseConfig = {
  authDomain: "logicq-clanguage.firebaseapp.com",
  projectId: "logicq-clanguage",
  storageBucket: "logicq-clanguage.firebasestorage.app",
  messagingSenderId: "898954156375",
  appId: "1:898954156375:web:838cb0fbbd27bb65f30612",
  measurementId: "G-EW7Z7K64FM",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("=== CREATING DEMO STUDENT IN FIRESTORE ===");

  const student = {
    prn: "2199IMTE1001",
    fullName: "Rohan Sharma",
    displayName: "Rohan Sharma",
    name: "Rohan Sharma",
    email: "rohan.sharma2026@gmail.com",
    password: "Password@123",
    department: "Integrated M.Tech",
    year: "First Year (FY)",
    division: "A",
    role: "STUDENT",
    sectionId: "sec-mw6l4r2s",
    sectionName: "Integrated Mtech",
    joinCode: "LQ-INTE34",
    joinToken: "LQ-INTE34",
    subject: "C Programming",
    status: "ENROLLED",
    joinedVia: "INSTANT_JOIN_LINK",
    profileComplete: true,
    isEmailBound: true,
    isEmailBoundV2: true,
    emailVerified: true,
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalSolved: 0,
    enrolledAt: new Date().toISOString(),
  };

  const prnLower = student.prn.toLowerCase();
  const emailKey = student.email.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // 1. users collection: users/std_2199imte1001
  console.log(`Writing users/std_${prnLower}...`);
  await setDoc(doc(db, "users", `std_${prnLower}`), {
    ...student,
    id: `std_${prnLower}`,
    username: prnLower,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // 2. enrolled_students collection: both PRN and Email keys
  console.log(`Writing enrolled_students/${prnLower}...`);
  await setDoc(doc(db, "enrolled_students", prnLower), {
    ...student,
    id: `std_${prnLower}`,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  console.log(`Writing enrolled_students/${emailKey}...`);
  await setDoc(doc(db, "enrolled_students", emailKey), {
    ...student,
    id: `std_${prnLower}`,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // 3. cohort_progress/__account_security
  console.log(`Writing cohort_progress/${student.prn}/drafts/__account_security...`);
  await setDoc(doc(db, "cohort_progress", student.prn, "drafts", "__account_security"), {
    code: student.password,
    password: student.password,
    prn: student.prn,
    verifiedEmail: student.email,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // 4. Update section in sections collection
  console.log(`Updating sections/sec-mw6l4r2s...`);
  await setDoc(doc(db, "sections", "sec-mw6l4r2s"), {
    studentsCount: 1,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // Also mirror to LQ-INTE34 in sections if queried by join code
  console.log(`Updating sections/LQ-INTE34...`);
  await setDoc(doc(db, "sections", "LQ-INTE34"), {
    id: "sec-mw6l4r2s",
    sectionName: "Integrated Mtech",
    joinCode: "LQ-INTE34",
    joinToken: "LQ-INTE34",
    course: "Integrated M.Tech",
    subject: "C Programming",
    semester: "Semester 1",
    academicYear: "2026-2027",
    isActive: true,
    studentsCount: 1,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  console.log("=== DEMO STUDENT CREATED SUCCESSFULLY ===");
  process.exit(0);
}

run().catch((err) => {
  console.error("Error creating demo student:", err);
  process.exit(1);
});
