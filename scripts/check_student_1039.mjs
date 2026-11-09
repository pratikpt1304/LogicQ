import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  authDomain: "logicq-clanguage.firebaseapp.com",
  projectId: "logicq-clanguage",
  storageBucket: "logicq-clanguage.firebasestorage.app",
  messagingSenderId: "898954156375",
  appId: "1:898954156375:web:838cb0fbbd27bb65f30612",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkStudent1039() {
  console.log("=== CHECKING 2126PMIM1039 ===");
  const enrDoc = await getDoc(doc(db, "enrolled_students", "2126PMIM1039"));
  console.log("enrolled_students:", enrDoc.exists() ? enrDoc.data() : "NOT FOUND");

  const cohortDoc = await getDoc(doc(db, "cohort_progress", "2126PMIM1039"));
  console.log("cohort_progress:", cohortDoc.exists() ? cohortDoc.data() : "NOT FOUND");

  const secDoc = await getDoc(doc(db, "cohort_progress", "2126PMIM1039", "drafts", "__account_security"));
  console.log("account_security draft:", secDoc.exists() ? secDoc.data() : "NOT FOUND");
}

checkStudent1039().catch(console.error);
