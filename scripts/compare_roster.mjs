import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  authDomain: "logicq-clanguage.firebaseapp.com",
  projectId: "logicq-clanguage",
  storageBucket: "logicq-clanguage.firebasestorage.app",
  messagingSenderId: "898954156375",
  appId: "1:898954156375:web:838cb0fbbd27bb65f30612",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const userListRaw = `
1	Samruddhi Rajesh Gangad	2126PMIF1057
2	Kirti Sandip Honde	2126PMIF1032
3	Gaytri Laxman Bhuse	2126PMIF1084
4	Pratik Balasaheb Thorat	2126PMIM1039
5	Yash Vishwas Kharad	2126PMIM1102
6	Aaditya Kiran Reddy	2126PMIM1067
7	Shivraj Pradip Navale	2126PMIM1009
8	Siddhesh Dattatray Borade	2126PMIM1073
9	Gavhane Ankit Arun	2126PMIM1038
10	Pathan Sarfaraj Aslam	2126PMIM1074
11	Rajnish Mahendra Mirikar	2125PMIM1073
12	Aditya Sachin Gore	2126PMIM1021
13	Shweta Amol Sadafal	2126PMIF1013
14	Shruti Santosh Barhate	2126PMIF1066
15	Prachi Sitaram Gadekar	2126PMIF1064
16	Sayali Manohar Nikam	2126PMIF1093
17	Shravani Dadasaheb Sabale	2126PMIF1043
18	Durva Sachin Jadhav	2126PMIF1121
19	Shreya Arjun Sirsat	2126PMIF1052
20	Manasvi Virendra Shinde	2126PMIF1094
21	Shraddha Prakash Hon	2126PMIF1078
22	Samrudhhi Babasaheb Nehe	2126PMIF1070
23	Shreya Kishor Sadaphal	2126PMIF1018
24	Vedika Promod Hon	2126PMIF1050
25	Sakshi Walmik Dongre	2126PMIF1112
26	Gauri Kishor Chandane	2126PMIF1101
27	Vaishnavi Balasaheb Bongane	2126PMIF1120
28	Samir Bhausaheb jejurkar	2126PMIM1059
29	Vasistha Sitaram Dhokane	2126PMIM1007
30	Yuvraj Avinash harishchandre	2126PMIM1049
31	Vedant Dnyaneshwar Jadhav	2126PMIM1047
32	Abhiraj Satish Badakh	2126PMIM1027
33	Mahesh Abasaheab Harde	2126PMIM1029
34	Harshal Nilesh Nirmal	2126PMIM1035
35	Aditya Yogesh Gore	2126PMIM1103
36	Ritesh Manesh Adhav	2126PMIM1051
37	Atharv Dyaneshwar Gholap	2126PMIM1003
38	Abhishek Babasaheb Shelar	2126PMIM1099
39	Om Ramesh Labhade	2126PMIM1012
40	Pradumna Uddhav Pawar	2126PMIM1117
41	Namrata Shejul	2126PMIF1019
42	Shrawani Devhadrao	2126PMIF1111
43	Pratiksha Dhamale	2126PMIF1060
44	Siddhi Sonawane	2126PMIF1028
45	Rutuja Shewale	2126PMIF1098
46	Samarth Rajesh Nashikkar	2126PMIM1100
47	Parth Machhindra Pachpute	2126PMIM1015
48	Ishant Prashant Choudhary	2126PMIM1065
49	Rehan Abdulshafiq Maniyar	2126PMIM1081
50	Divya Balasaheb Sonawane	2126PMIF1106
51	Pawan Kshirsagar	2126PMIM1080
52	Mayur Chaudhari	2126PMIM1008
53	Sarthak Mandlik	2126PMIM1005
54	Prasad Pawar	2126PMIM1044
55	Pranav Suse	2126PMIM1017
56	Parth Potdukhe	2126PMIM1097
57	Ketki Dattatray Gadakh	2126PMIF1014
58	Kaveri Kailas Ghorpade	2126PMIF1063
59	Akansha Sharad Landge	2126PMIF1058
60	Ishwari Ravindra Sanap	2126PMIF1022
61	Gauri Navnath Kadam	2126PMIF1025
62	Harshada Mangesh Nagpure	2126PMIF1024
63	Shweta Rajesh Pachore	2126PMIF1113
64	Ayush Jalindar Bhosale	2126PMIM1033
65	Samarth Popat Shisode	2126PMIM1048
66	Atharva Sachin Magar	2126PMIM1041
67	Yashraj Ankush Gade	2126PMIM1036
68	Swaraj Rajendra Halnor	2126PMIM1118
69	Parth Vishal Warade	2126PMIM1122
70	Vivek Gangadhar Tuwar	2126PMIM1124
71	Satyam Atul Velgude	2126PMIM1016
72	Jagdish Dnyaneshwar Gaikwad	2126PMIM1011
73	Siddhesh Umesh Wakchoure	2126PMIM1006
74	Soham Jejurkar	2126PMIM1085
75	Sujal Walunj	2126PMIM1109
76	Sarthak Dusane	2126PMIM1107
77	Sarthak Shinde	2126PMIM1069
78	Atharva Bangaye	2126PMIM1046
79	Ganesh Chavan	2126PMIM1055
80	Nihal Attrade	2126PMIM1083
81	Gagandeepsingh Pothiwal	2126PMIM1114
82	Kunal Jejurkar	2126PMIM1040
83	Shreyas Shinde	2126PMIM1031
84	Siddhant Kale	2126PMIM1110
85	Siddheshwar Lahare	2126PMIM1105
86	Sahil Sonawane	2126PMIM1002
87	Sarthak Pawar	2126PMIM1020
88	Jeet Hitesh Patel	2126PMIM1086
89	Aditya Pratap Sadaphal	2126PMIM1082
90	Priyanshu Anil Wabale	2126PMIM1119
91	Vedant Santosh Mate	2126PMIM1004
92	Prem Satish Jadhav	2126PMIM1079
93	Om Machindra Jadhav	2126PMIM1087
94	Saad Altaf shaikh	2126PMIM1026
95	Vivek Ganesh Anbhule	2126PMIM1056
96	Pratik Chetan Chavale	2126PMIM1037
97	Aditya Bhaginath Darunte	2126PMIM1075
98	Shwet Sanjay kadam	2126PMIM1076
99	Anand Ramesh Kshirsagar	2126PMIM1088
100	Shubham Anil Deore	2126PMIM1072
101	Devendra Ashok Sonawane	2126PMIM1108
102	Sai Dadasaheb Gavande	2126PMIM1030
103	Om Ravindra Bhande	2126PMIM1089
104	Prasad Ganesh Morade	2126PMIM1023
105	Avinash Anil Mapari	2126PMIM1034
106	PIYUSH PATEL	2126PMIM1095
107	SHUBHAM VIJAY GAIKWAD	2126PMIM1053
108	JAGTAP ROHAN SUNIL	2126PMIM1054
109	OM RAVINDRA SALUNKE	2126PMIM1077
110	YOGESH RAMLAL KUMAWAT	2126PMIM1104
111	PAWAN SANJAY WALKE	2126PMIM1061
112	Onkar Mungase	2126PMIM1068
113	Om Hadole	2126PMIM1010
114	Kishor Devidas Kharad	2126PMIM1001
115	Rugved Ghogare	2126PMIM1091
116	Sarthak Abasaheb Adik	2126PMIM1071
`;

const lines = userListRaw.trim().split("\n");
const userPrns = new Set();
const userStudents = [];

for (const line of lines) {
  const parts = line.split("\t").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const prn = parts[2].toUpperCase();
    const name = parts[1];
    userPrns.add(prn);
    userStudents.push({ prn, name });
  }
}

console.log(`Parsed ${userStudents.length} students from user prompt.`);

async function compare() {
  const enrSnap = await getDocs(collection(db, "enrolled_students"));
  const fsStudents = [];
  enrSnap.forEach((d) => {
    fsStudents.push({ id: d.id, ...d.data() });
  });

  console.log(`Current Firestore enrolled_students count: ${fsStudents.length}`);

  const notInUserList = [];
  for (const fs of fsStudents) {
    const prn = (fs.prn || fs.id).toUpperCase();
    if (!userPrns.has(prn)) {
      notInUserList.push({ id: fs.id, prn, name: fs.fullName || fs.name, email: fs.email });
    }
  }

  console.log(`\nStudents in Firestore BUT NOT in user's 116 list (${notInUserList.length}):`);
  notInUserList.forEach((s) => {
    console.log(`  - ID: ${s.id} | PRN: ${s.prn} | Name: ${s.name} | Email: ${s.email}`);
  });

  const notInFirestore = [];
  for (const u of userStudents) {
    const found = fsStudents.some((fs) => (fs.prn || fs.id).toUpperCase() === u.prn);
    if (!found) {
      notInFirestore.push(u);
    }
  }

  console.log(`\nStudents in user list BUT NOT in Firestore (${notInFirestore.length}):`);
  notInFirestore.forEach((s) => {
    console.log(`  - PRN: ${s.prn} | Name: ${s.name}`);
  });
}

compare().catch(console.error);
