import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  collection,
  getDocs,
  deleteDoc,
  setDoc,
  getDoc,
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

async function run() {
  console.log("=== RESETTING ALL STUDENT PASSWORDS TO PRN & UNBINDING ALL DEVICES ===");

  // 1. Fetch all enrolled students
  const enrolledSnap = await getDocs(collection(db, "enrolled_students"));
  console.log(`Found ${enrolledSnap.size} enrolled students.`);

  let resetCount = 0;
  for (const sDoc of enrolledSnap.docs) {
    const data = sDoc.data();
    const prn = data.prn ? String(data.prn).toUpperCase().trim() : null;
    if (!prn) continue;

    if (prn === "DUMMY") {
      // Ensure dummy student retains password 'dummy'
      await setDoc(
        doc(db, "cohort_progress", "DUMMY", "drafts", "__account_security"),
        { code: "dummy", updatedAt: new Date().toISOString() },
        { merge: true }
      );
      continue;
    }

    // Delete custom password override so default PRN becomes the authoritative password
    try {
      await deleteDoc(doc(db, "cohort_progress", prn, "drafts", "__account_security"));
    } catch (e) {
      console.warn(`Failed to delete secDoc for ${prn}:`, e.message);
    }

    // Unbind all registered devices in cohort_progress
    try {
      const cohortDoc = await getDoc(doc(db, "cohort_progress", prn)).catch(() => null);
      const existingMod = cohortDoc?.data()?.moduleProgress || {};
      await setDoc(
        doc(db, "cohort_progress", prn),
        {
          prn,
          moduleProgress: {
            ...existingMod,
            registeredDevices: [],
          },
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn(`Failed to unbind devices in cohort_progress for ${prn}:`, e.message);
    }

    resetCount++;
  }

  // 2. Scan cohort_progress directly to ensure any extra cohort docs are also reset
  const cohortSnap = await getDocs(collection(db, "cohort_progress"));
  console.log(`Scanning ${cohortSnap.size} cohort_progress documents...`);
  for (const cDoc of cohortSnap.docs) {
    const prn = cDoc.id.toUpperCase().trim();
    if (prn === "DUMMY") continue;

    try {
      await deleteDoc(doc(db, "cohort_progress", prn, "drafts", "__account_security"));
      const existingMod = cDoc.data()?.moduleProgress || {};
      await setDoc(
        doc(db, "cohort_progress", prn),
        {
          prn,
          moduleProgress: {
            ...existingMod,
            registeredDevices: [],
          },
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch (e) {
      // ignore
    }
  }

  console.log(`=== SUCCESS: Reset ${resetCount} student accounts to default PRN passwords & unbound all devices! ===`);
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
