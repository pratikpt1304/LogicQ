import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
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
  console.log("=== 1. FETCHING SECTIONS & FACULTY IN-CHARGE ===");
  try {
    const secSnap = await getDocs(collection(db, "sections"));
    console.log(`Found ${secSnap.size} sections:`);
    secSnap.forEach(d => {
      const data = d.data();
      console.log(`- Section ID: ${d.id}`);
      console.log(`  Name: ${data.sectionName || data.name}`);
      console.log(`  Faculty In-Charge: ${data.facultyName || 'Dr. Hariprasath Manoharan'}`);
      console.log(`  Faculty Email: ${data.facultyEmail || 'hariprasathset@sanjivani.edu.in'}`);
      console.log(`  Students count in section: ${data.students?.length || 0}`);
    });
  } catch (e) {
    console.log("Error fetching sections:", e.message);
  }

  console.log("\n=== 2. FETCHING ENROLLED STUDENTS (ROSTER) ===");
  try {
    const enrSnap = await getDocs(collection(db, "enrolled_students"));
    console.log(`Total Enrolled Students: ${enrSnap.size}`);
    const students = [];
    enrSnap.forEach(d => {
      students.push({ id: d.id, ...d.data() });
    });

    students.sort((a, b) => (a.prn || '').localeCompare(b.prn || ''));
    students.forEach((s, i) => {
      console.log(`  ${i + 1}. [${s.prn || s.id}] ${s.fullName || s.name} | ${s.email} | ${s.division || s.section || 'Integrated Mtech'}`);
    });
  } catch (e) {
    console.log("Error fetching enrolled students:", e.message);
  }
}

run().catch(console.error);
