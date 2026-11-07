import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  setDoc,
  updateDoc,
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

async function resetPratik() {
  console.log("=== STARTING COMPLETE PRATIK DATA WIPE ===");
  const prn = "2126PMIM1039";
  const email = "thoratpratik2323@gmail.com";

  // 1. Delete Submissions with studentPrn
  const qPrn = query(collection(db, "submissions"), where("studentPrn", "==", prn));
  const snapPrn = await getDocs(qPrn);
  console.log(`Found ${snapPrn.size} submissions for studentPrn=${prn}`);
  for (const d of snapPrn.docs) {
    console.log(`Deleting submission ${d.id} (${d.data().problemSlug || d.data().problemTitle})...`);
    await deleteDoc(d.ref);
  }

  // 2. Delete Submissions with studentEmail
  const qEmail = query(collection(db, "submissions"), where("studentEmail", "==", email));
  const snapEmail = await getDocs(qEmail);
  console.log(`Found ${snapEmail.size} submissions for studentEmail=${email}`);
  for (const d of snapEmail.docs) {
    console.log(`Deleting submission ${d.id}...`);
    await deleteDoc(d.ref);
  }

  // 3. Delete cohort_progress
  try {
    const cpRef = doc(db, "cohort_progress", prn);
    const cpSnap = await getDoc(cpRef);
    if (cpSnap.exists()) {
      console.log("Deleting cohort_progress doc for", prn);
      await deleteDoc(cpRef);
    } else {
      console.log("cohort_progress doc does not exist.");
    }
  } catch (e) {
    console.warn("cohort_progress error:", e.message);
  }

  // 4. Find users matching PRN or email
  const userIds = new Set([prn, "cohort-2126pmim1039"]);
  const qU1 = query(collection(db, "users"), where("prn", "==", prn));
  const snapU1 = await getDocs(qU1);
  snapU1.forEach(d => userIds.add(d.id));

  const qU2 = query(collection(db, "users"), where("email", "==", email));
  const snapU2 = await getDocs(qU2);
  snapU2.forEach(d => userIds.add(d.id));

  console.log("Matched User IDs:", Array.from(userIds));

  for (const uid of userIds) {
    // Delete submissions by userId
    const qSub = query(collection(db, "submissions"), where("userId", "==", uid));
    const snapSub = await getDocs(qSub);
    console.log(`User ${uid} has ${snapSub.size} submissions`);
    for (const d of snapSub.docs) {
      console.log(`Deleting submission ${d.id}...`);
      await deleteDoc(d.ref);
    }

    // Delete drafts subcollection docs
    try {
      const draftsSnap = await getDocs(collection(db, "users", uid, "drafts"));
      console.log(`User ${uid} has ${draftsSnap.size} drafts`);
      for (const d of draftsSnap.docs) {
        if (d.id === "proctoring_telemetry") {
          console.log(`Resetting proctoring_telemetry for ${uid}...`);
          await setDoc(d.ref, {
            tabSwitchCount: 0,
            copyPasteAttempts: 0,
            fullscreenExits: 0,
            autoLockCount: 0,
            integrityScore: 100,
            incidents: [],
            lastIncidentAt: null,
            updatedAt: serverTimestamp(),
          });
        } else {
          console.log(`Deleting draft ${d.id} for ${uid}...`);
          await deleteDoc(d.ref);
        }
      }
    } catch (e) {
      console.warn("Drafts error:", e.message);
    }

    // Reset user doc progress
    try {
      const uRef = doc(db, "users", uid);
      const uSnap = await getDoc(uRef);
      if (uSnap.exists()) {
        console.log(`Resetting user doc stats for ${uid}...`);
        await updateDoc(uRef, {
          solvedCount: 0,
          points: 0,
          cieMarks: 0,
          totalSubmissions: 0,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.warn("User stats update error:", e.message);
    }

    // Reset progress/current
    try {
      await setDoc(doc(db, "users", uid, "progress", "current"), {
        solvedPracticeTopicIds: [],
        solvedLabProblemSlugs: [],
        cieMarks: 0,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {}
  }

  console.log("=== PRATIK DATA WIPE COMPLETE IN FIRESTORE ===");
  process.exit(0);
}

resetPratik().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
