import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
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
  console.log("=== SEEDING DUMMY / DUMMY DEMO STUDENT IN FIRESTORE ===");

  // 1. enrolled_students/dummy
  console.log("Writing enrolled_students/dummy...");
  await setDoc(doc(db, "enrolled_students", "dummy"), {
    prn: "DUMMY",
    name: "Dummy",
    fullName: "Dummy",
    displayName: "Dummy",
    email: "dummy@logicq.io",
    sectionId: "sec-mw6l4r2s",
    department: "Integrated M.Tech",
    year: "First Year (FY)",
    division: "A",
    status: "ENROLLED",
    joinedVia: "INSTANT_JOIN_LINK",
    enrolledAt: new Date().toISOString(),
  });

  // 2. cohort_progress/DUMMY/drafts/__account_security
  console.log("Writing cohort_progress/DUMMY/drafts/__account_security...");
  await setDoc(doc(db, "cohort_progress", "DUMMY", "drafts", "__account_security"), {
    code: "dummy",
    updatedAt: new Date().toISOString(),
  });

  // 3. cohort_progress/DUMMY
  console.log("Writing cohort_progress/DUMMY...");
  await setDoc(doc(db, "cohort_progress", "DUMMY"), {
    prn: "DUMMY",
    totalSolved: 0,
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    completedProblems: [],
    updatedAt: new Date().toISOString(),
  });

  // 4. sections/sec-mw6l4r2s/students/dummy
  console.log("Writing sections/sec-mw6l4r2s/students/dummy...");
  await setDoc(doc(db, "sections", "sec-mw6l4r2s", "students", "dummy"), {
    id: "dummy",
    prn: "DUMMY",
    name: "Dummy",
    fullName: "Dummy",
    displayName: "Dummy",
    email: "dummy@logicq.io",
    status: "ENROLLED",
    joinedVia: "INSTANT_JOIN_LINK",
    enrolledAt: new Date().toISOString(),
  });

  // 5. Update section details & student count
  console.log("Updating sections/sec-mw6l4r2s...");
  await setDoc(doc(db, "sections", "sec-mw6l4r2s"), {
    course: "Integrated M.Tech",
    subject: "C Programming",
    sectionName: "Integrated Mtech",
    joinCode: "LQ-INTE34",
    studentsCount: 1,
  }, { merge: true });

  console.log("=== SEEDING COMPLETED SUCCESSFULLY ===");
  process.exit(0);
}

run().catch((err) => {
  console.error("Error seeding dummy student:", err);
  process.exit(1);
});
