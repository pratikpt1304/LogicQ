import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  getDoc
} from "firebase/firestore";

const firebaseConfig = {
  authDomain: "logicq-clanguage.firebaseapp.com",
  projectId: "logicq-clanguage",
  storageBucket: "logicq-clanguage.firebasestorage.app",
  messagingSenderId: "898954156375",
  appId: "1:898954156375:web:838cb0fbbd27bb65f30612",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testSet() {
  const prn = "2126PMIM1105";
  const instEmail = "2126pmim1105@sanjivani.edu.in";

  // 1. cohort_progress
  console.log("Testing cohort_progress...");
  const cpPayload = {
    prn,
    totalSolved: 0,
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    completedProblems: [],
    draftCodes: {},
    isBanned: false,
    studentName: "Siddheshwar Lahare",
    studentEmail: instEmail,
    isEmailBound: false,
    isEmailBoundV2: false,
    emailVerified: false,
    activeSession: false,
    registeredDevices: [],
    tabSwitches: 0,
    pasteBursts: 0,
    clipboardAttempts: 0,
    fullscreenExits: 0,
    integrityScore: 100,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, "cohort_progress", prn), cpPayload);
    console.log("SUCCESS: cohort_progress updated!");
  } catch (e) {
    console.error("FAIL cohort_progress:", e.message);
  }

  // 2. enrolled_students
  console.log("Testing enrolled_students...");
  const enrSnap = await getDoc(doc(db, "enrolled_students", prn));
  const ex = enrSnap.data() || {};
  const enrPayload = {
    prn,
    name: "Siddheshwar Lahare",
    fullName: "Siddheshwar Lahare",
    displayName: "Siddheshwar Lahare",
    email: instEmail,
    isEmailBound: false,
    isEmailBoundV2: false,
    isBanned: false,
    integrityScore: 100,
    tabSwitchCount: 0,
    tabSwitches: 0,
    pasteBursts: 0,
    copyPasteAttempts: 0,
    status: "ACTIVE",
    updatedAt: serverTimestamp(),
    sectionId: ex.sectionId || "LQ-C31A",
    sectionName: ex.sectionName || "C Programming Masterclass",
    course: ex.course || "Integrated M.Tech",
    college: ex.college || "Sanjivani University",
    department: ex.department || "Integrated M.Tech",
    year: ex.year || "FY",
    division: ex.division || "A",
    institution: ex.institution || "Sanjivani University",
    subject: ex.subject || "C Programming",
    joinedVia: ex.joinedVia || "ADMIN_ROSTER",
  };

  try {
    await setDoc(doc(db, "enrolled_students", prn), enrPayload);
    console.log("SUCCESS: enrolled_students updated!");
  } catch (e) {
    console.error("FAIL enrolled_students:", e.message);
  }
}

testSet().catch(console.error);
