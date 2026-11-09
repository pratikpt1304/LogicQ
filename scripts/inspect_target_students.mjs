import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
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

const TARGET_PRNS = ["2126PMIM1105", "2126PMIM1039", "2126PMIF1057"];

async function inspect() {
  console.log("=== INSPECTING TARGET STUDENTS ===");

  for (const prn of TARGET_PRNS) {
    console.log(`\n================== PRN: ${prn} ==================`);

    // 1. enrolled_students
    const enrRef = doc(db, "enrolled_students", prn);
    const enrSnap = await getDoc(enrRef).catch((e) => ({ exists: () => false, err: e.message }));
    if (enrSnap.exists?.()) {
      console.log(`[enrolled_students/${prn}]:`, JSON.stringify(enrSnap.data(), null, 2));
    } else {
      console.log(`[enrolled_students/${prn}]: NOT FOUND (or error: ${enrSnap.err})`);
    }

    // 2. cohort_progress
    const cpRef = doc(db, "cohort_progress", prn);
    const cpSnap = await getDoc(cpRef).catch((e) => ({ exists: () => false, err: e.message }));
    if (cpSnap.exists?.()) {
      console.log(`[cohort_progress/${prn}]:`, JSON.stringify(cpSnap.data(), null, 2));
    } else {
      console.log(`[cohort_progress/${prn}]: NOT FOUND`);
    }

    // 2b. cohort_progress drafts
    try {
      const draftsSnap = await getDocs(collection(db, "cohort_progress", prn, "drafts"));
      console.log(`[cohort_progress/${prn}/drafts]: ${draftsSnap.size} docs`);
      draftsSnap.forEach(d => console.log(`  - draft ${d.id}:`, d.data()));
    } catch (e) {
      console.log(`[cohort_progress/${prn}/drafts] error:`, e.message);
    }

    // 3. users matching PRN
    const qUsers = query(collection(db, "users"), where("prn", "==", prn));
    const uSnap = await getDocs(qUsers).catch((e) => ({ size: 0, docs: [], err: e.message }));
    console.log(`[users with prn=${prn}]: ${uSnap.size || 0}`);
    uSnap.docs?.forEach(d => console.log(`  - user doc ${d.id}:`, d.data()));

    // 4. Submissions
    const qSub1 = query(collection(db, "submissions"), where("studentPrn", "==", prn));
    const sub1Snap = await getDocs(qSub1).catch((e) => ({ size: 0, docs: [] }));
    console.log(`[submissions with studentPrn=${prn}]: ${sub1Snap.size}`);
    sub1Snap.docs?.forEach(d => console.log(`  - sub ${d.id} (${d.data().submissionType || 'unknown'}): ${d.data().problemTitle || d.data().problemSlug}`));

    // 5. assessment_test_submissions
    try {
      const qAss = query(collection(db, "assessment_test_submissions"), where("studentPrn", "==", prn));
      const assSnap = await getDocs(qAss);
      console.log(`[assessment_test_submissions with studentPrn=${prn}]: ${assSnap.size}`);
      assSnap.docs?.forEach(d => console.log(`  - assSub ${d.id}:`, d.data().problemTitle || d.data().problemId));
    } catch (e) {
      console.log(`[assessment_test_submissions] error:`, e.message);
    }

    // 6. assessment_submissions
    try {
      const qAss2 = query(collection(db, "assessment_submissions"), where("studentPrn", "==", prn));
      const assSnap2 = await getDocs(qAss2);
      console.log(`[assessment_submissions with studentPrn=${prn}]: ${assSnap2.size}`);
      assSnap2.docs?.forEach(d => console.log(`  - assSub2 ${d.id}:`, d.data().problemTitle || d.data().problemId));
    } catch (e) {
      console.log(`[assessment_submissions] error:`, e.message);
    }
  }

  process.exit(0);
}

inspect().catch(console.error);
