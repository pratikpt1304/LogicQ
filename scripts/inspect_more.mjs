import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
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

const EMAILS = ["siddheshwarlahare@gmail.com", "thoratpratik2323@gmail.com", "samugangad@gmail.com"];
const UIDS = ["std_2126pmim1105", "std_2126pmim1039", "std_2126pmif1057"];

async function checkMore() {
  console.log("=== CHECKING SUBMISSIONS BY EMAIL & UID ===");

  for (const col of ["submissions", "assessment_test_submissions", "assessment_submissions"]) {
    for (const email of EMAILS) {
      const q = query(collection(db, col), where("studentEmail", "==", email));
      const s = await getDocs(q).catch(e => ({ size: 0, docs: [] }));
      if (s.size > 0) {
        console.log(`[${col}] for email ${email}: ${s.size} submissions found`);
        s.docs.forEach(d => console.log(`  - ${d.id}: ${d.data().problemTitle || d.data().problemSlug}`));
      }
    }

    for (const uid of UIDS) {
      const q = query(collection(db, col), where("userId", "==", uid));
      const s = await getDocs(q).catch(e => ({ size: 0, docs: [] }));
      if (s.size > 0) {
        console.log(`[${col}] for userId ${uid}: ${s.size} submissions found`);
        s.docs.forEach(d => console.log(`  - ${d.id}: ${d.data().problemTitle || d.data().problemSlug}`));
      }
    }
  }

  process.exit(0);
}

checkMore().catch(console.error);
