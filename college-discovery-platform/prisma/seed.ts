import { PrismaClient, OwnershipType } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const prisma = new PrismaClient();

// Helper to slugify college names
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start
    .replace(/-+$/, ""); // Trim - from end
}

// Custom CSV line parser to handle quoted commas correctly
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// 50 realistic prominent colleges data
interface EnrichedCollege {
  name: string;
  slugName: string; // for slug matching
  location: string;
  city: string;
  state: string;
  ownership: OwnershipType;
  accreditation: string;
  rating: number;
  established: number;
  website: string;
  logoUrl: string;
  images: string[];
  description: string;
  courses: {
    name: string;
    stream: string;
    duration: string;
    fees: number;
    eligibility: string;
  }[];
  placements: {
    highestPackage: number;
    averagePackage: number;
    medianPackage: number;
    placementRate: number;
    topRecruiters: string[];
  };
  reviews: {
    rating: number;
    content: string;
    author: string;
  }[];
}

const prominentColleges: EnrichedCollege[] = [
  // 1. IIT Bombay
  {
    name: "Indian Institute of Technology Bombay",
    slugName: "iit-bombay",
    location: "Powai, Mumbai",
    city: "Mumbai",
    state: "Maharashtra",
    ownership: OwnershipType.GOVERNMENT,
    accreditation: "NAAC A++",
    rating: 4.8,
    established: 1958,
    website: "https://www.iitb.ac.in",
    logoUrl: "https://picsum.photos/seed/iitb_logo/200/200",
    images: [
      "https://picsum.photos/seed/iitb1/800/500",
      "https://picsum.photos/seed/iitb2/800/500",
      "https://picsum.photos/seed/iitb3/800/500"
    ],
    description: "Established in 1958, the second of its kind, IIT Bombay was the first to be set up with foreign assistance. It is recognized worldwide as a leader in engineering education and research.",
    courses: [
      { name: "B.Tech in Computer Science & Engineering", stream: "Engineering", duration: "4 Years", fees: 220000, eligibility: "JEE Advanced" },
      { name: "B.Tech in Electrical Engineering", stream: "Engineering", duration: "4 Years", fees: 220000, eligibility: "JEE Advanced" },
      { name: "B.Tech in Mechanical Engineering", stream: "Engineering", duration: "4 Years", fees: 220000, eligibility: "JEE Advanced" },
      { name: "B.Tech in Aerospace Engineering", stream: "Engineering", duration: "4 Years", fees: 220000, eligibility: "JEE Advanced" },
      { name: "M.Tech in Microelectronics", stream: "Engineering", duration: "2 Years", fees: 85000, eligibility: "GATE" },
      { name: "Ph.D. in Computer Science", stream: "Science", duration: "3-5 Years", fees: 40000, eligibility: "GATE/NET" }
    ],
    placements: {
      highestPackage: 36000000, // 3.6 Cr
      averagePackage: 2180000,  // 21.8 LPA
      medianPackage: 1950000,   // 19.5 LPA
      placementRate: 96.5,
      topRecruiters: ["Google", "Microsoft", "Qualcomm", "TATA", "Apple", "Uber", "Morgan Stanley"]
    },
    reviews: [
      { rating: 5, content: "Outstanding academic culture, unmatched research exposure, and top-tier placements. Highly competitive environment.", author: "Rohan Kulkarni" },
      { rating: 4, content: "Excellent campus facilities and sports infrastructure. Hostel life is great, although academics can be highly stressful.", author: "Sneha Patil" },
      { rating: 5, content: "The alumni network is extremely strong, opening doors globally. Best 4 years of my life!", author: "Vikram Rathore" }
    ]
  },
  // 2. IIT Delhi
  {
    name: "Indian Institute of Technology Delhi",
    slugName: "iit-delhi",
    location: "Hauz Khas, New Delhi",
    city: "New Delhi",
    state: "Delhi",
    ownership: OwnershipType.GOVERNMENT,
    accreditation: "NAAC A++",
    rating: 4.7,
    established: 1961,
    website: "https://home.iitd.ac.in",
    logoUrl: "https://picsum.photos/seed/iitd_logo/200/200",
    images: [
      "https://picsum.photos/seed/iitd1/800/500",
      "https://picsum.photos/seed/iitd2/800/500",
      "https://picsum.photos/seed/iitd3/800/500"
    ],
    description: "Indian Institute of Technology Delhi is one of the 23 IITs created to be Centres of Excellence for training, research and development in science, engineering and technology in India.",
    courses: [
      { name: "B.Tech in Computer Science & Engineering", stream: "Engineering", duration: "4 Years", fees: 225000, eligibility: "JEE Advanced" },
      { name: "B.Tech in Mathematics & Computing", stream: "Engineering", duration: "4 Years", fees: 225000, eligibility: "JEE Advanced" },
      { name: "B.Tech in Chemical Engineering", stream: "Engineering", duration: "4 Years", fees: 225000, eligibility: "JEE Advanced" },
      { name: "M.Tech in VLSI Design", stream: "Engineering", duration: "2 Years", fees: 90000, eligibility: "GATE" }
    ],
    placements: {
      highestPackage: 24000000, // 2.4 Cr
      averagePackage: 2050000,  // 20.5 LPA
      medianPackage: 1800000,   // 18 LPA
      placementRate: 95.0,
      topRecruiters: ["Google", "Microsoft", "Goldman Sachs", "Amazon", "Intel", "Samsung"]
    },
    reviews: [
      { rating: 5, content: "Hauz Khas location gives a massive advantage. Peer group is incredibly brilliant.", author: "Arjun Singhal" },
      { rating: 4, content: "Professors are top class, though some labs need modern equipment. Placements are solid.", author: "Divya Gupta" }
    ]
  },
  // 3. IIT Madras
  {
    name: "Indian Institute of Technology Madras",
    slugName: "iit-madras",
    location: "Adyar, Chennai",
    city: "Chennai",
    state: "Tamil Nadu",
    ownership: OwnershipType.GOVERNMENT,
    accreditation: "NAAC A++",
    rating: 4.9,
    established: 1959,
    website: "https://www.iitm.ac.in",
    logoUrl: "https://picsum.photos/seed/iitm_logo/200/200",
    images: [
      "https://picsum.photos/seed/iitm1/800/500",
      "https://picsum.photos/seed/iitm2/800/500"
    ],
    description: "IIT Madras is a residential institute with nearly 550 faculty, 10,000 students and 1,250 administrative and supporting staff. It has been ranked No. 1 in NIRF Overall Category for consecutive years.",
    courses: [
      { name: "B.Tech in Computer Science & Engineering", stream: "Engineering", duration: "4 Years", fees: 215000, eligibility: "JEE Advanced" },
      { name: "B.Tech in Engineering Physics", stream: "Engineering", duration: "4 Years", fees: 215000, eligibility: "JEE Advanced" },
      { name: "BS + MS Dual Degree in Data Science", stream: "Science", duration: "5 Years", fees: 190000, eligibility: "JEE Advanced" }
    ],
    placements: {
      highestPackage: 19800000, // 1.98 Cr
      averagePackage: 2140000,  // 21.4 LPA
      medianPackage: 1750000,
      placementRate: 97.2,
      topRecruiters: ["Microsoft", "Google", "Texas Instruments", "L&T", "Nvidia", "Adobe"]
    },
    reviews: [
      { rating: 5, content: "NIRF Rank 1 for a reason. Outstanding campus inside a forest filled with deer. Extremely rich research culture.", author: "Vijay Iyer" }
    ]
  },
  // 4. IIT Kanpur
  {
    name: "Indian Institute of Technology Kanpur",
    slugName: "iit-kanpur",
    location: "Kalyanpur, Kanpur",
    city: "Kanpur",
    state: "Uttar Pradesh",
    ownership: OwnershipType.GOVERNMENT,
    accreditation: "NAAC A++",
    rating: 4.7,
    established: 1959,
    website: "https://www.iitk.ac.in",
    logoUrl: "https://picsum.photos/seed/iitk_logo/200/200",
    images: ["https://picsum.photos/seed/iitk1/800/500"],
    description: "IIT Kanpur is known for its academic freedom, vibrant student gymkhana, and the famous helicopter runway. It has the first computer science program in the country.",
    courses: [
      { name: "B.Tech in Computer Science", stream: "Engineering", duration: "4 Years", fees: 212000, eligibility: "JEE Advanced" },
      { name: "B.Tech in Cognitive Science", stream: "Science", duration: "4 Years", fees: 212000, eligibility: "JEE Advanced" }
    ],
    placements: {
      highestPackage: 22000000,
      averagePackage: 1960000,
      medianPackage: 1700000,
      placementRate: 92.8,
      topRecruiters: ["Google", "Microsoft", "Goldman Sachs", "Optiver", "Rubrik"]
    },
    reviews: [
      { rating: 5, content: "Incredible coding culture. The academic load is very heavy, but it prepares you for anything.", author: "Piyush Agrawal" }
    ]
  },
  // 5. IIT Kharagpur
  {
    name: "Indian Institute of Technology Kharagpur",
    slugName: "iit-kharagpur",
    location: "Kharagpur",
    city: "Kharagpur",
    state: "West Bengal",
    ownership: OwnershipType.GOVERNMENT,
    accreditation: "NAAC A++",
    rating: 4.6,
    established: 1951,
    website: "https://www.iitkgp.ac.in",
    logoUrl: "https://picsum.photos/seed/iitkgp_logo/200/200",
    images: ["https://picsum.photos/seed/iitkgp1/800/500"],
    description: "The first IIT to be established in India, IIT Kharagpur has the largest campus area (2,100 acres) and the highest number of departments and student enrollment.",
    courses: [
      { name: "B.Tech in Computer Science & Engineering", stream: "Engineering", duration: "4 Years", fees: 210000, eligibility: "JEE Advanced" },
      { name: "Integrated M.Sc. in Physics", stream: "Science", duration: "5 Years", fees: 180000, eligibility: "JEE Advanced" }
    ],
    placements: {
      highestPackage: 26000000,
      averagePackage: 1850000,
      medianPackage: 1600000,
      placementRate: 91.5,
      topRecruiters: ["Microsoft", "Google", "PWC", "Intel", "Samsung", "TCS"]
    },
    reviews: [
      { rating: 4, content: "Huge campus, amazing Spring Fest and Kshitij festivals. Placements are massive.", author: "Sourav Dey" }
    ]
  },
  // 6. NIT Trichy
  {
    name: "National Institute of Technology Tiruchirappalli",
    slugName: "nit-trichy",
    location: "Thanjavur Road, Tiruchirappalli",
    city: "Tiruchirappalli",
    state: "Tamil Nadu",
    ownership: OwnershipType.GOVERNMENT,
    accreditation: "NAAC A+",
    rating: 4.5,
    established: 1964,
    website: "https://www.nitt.edu",
    logoUrl: "https://picsum.photos/seed/nitt_logo/200/200",
    images: ["https://picsum.photos/seed/nitt1/800/500"],
    description: "NIT Trichy is consistently ranked as the No. 1 NIT in India by NIRF. It offers engineering, management, architecture and humanities programs.",
    courses: [
      { name: "B.Tech in Computer Science & Engineering", stream: "Engineering", duration: "4 Years", fees: 145000, eligibility: "JEE Main" },
      { name: "B.Tech in Electronics & Communication Engineering", stream: "Engineering", duration: "4 Years", fees: 145000, eligibility: "JEE Main" }
    ],
    placements: {
      highestPackage: 5200000,
      averagePackage: 1420000,
      medianPackage: 1200000,
      placementRate: 94.2,
      topRecruiters: ["Amazon", "Microsoft", "Oracle", "Cisco", "L&T", "TCS"]
    },
    reviews: [
      { rating: 5, content: "Best NIT in India, infrastructure is very good. Placement percentage is highly consistent.", author: "Hari Prasad" }
    ]
  },
  // 7. NIT Surathkal
  {
    name: "National Institute of Technology Karnataka Surathkal",
    slugName: "nit-surathkal",
    location: "Surathkal, Mangaluru",
    city: "Mangaluru",
    state: "Karnataka",
    ownership: OwnershipType.GOVERNMENT,
    accreditation: "NAAC A+",
    rating: 4.5,
    established: 1960,
    website: "https://www.nitk.ac.in",
    logoUrl: "https://picsum.photos/seed/nitk_logo/200/200",
    images: ["https://picsum.photos/seed/nitk1/800/500"],
    description: "NITK Surathkal has a private beach on the Arabian Sea, making it one of the most scenic and unique campuses in India.",
    courses: [
      { name: "B.Tech in Computer Science", stream: "Engineering", duration: "4 Years", fees: 150000, eligibility: "JEE Main" },
      { name: "B.Tech in Information Technology", stream: "Engineering", duration: "4 Years", fees: 150000, eligibility: "JEE Main" }
    ],
    placements: {
      highestPackage: 5400000,
      averagePackage: 1450000,
      medianPackage: 1250000,
      placementRate: 93.8,
      topRecruiters: ["Microsoft", "Uber", "Goldman Sachs", "DE Shaw", "Intel"]
    },
    reviews: [
      { rating: 5, content: "Campus has its own private beach! Placements are on par with top IITs.", author: "Kiran Naik" }
    ]
  },
  // 8. NIT Warangal
  {
    name: "National Institute of Technology Warangal",
    slugName: "nit-warangal",
    location: "Hanamkonda, Warangal",
    city: "Warangal",
    state: "Telangana",
    ownership: OwnershipType.GOVERNMENT,
    accreditation: "NAAC A+",
    rating: 4.4,
    established: 1959,
    website: "https://www.nitw.ac.in",
    logoUrl: "https://picsum.photos/seed/nitw_logo/200/200",
    images: ["https://picsum.photos/seed/nitw1/800/500"],
    description: "Established by Prime Minister Jawaharlal Nehru, it was the first Regional Engineering College (REC) in the country.",
    courses: [
      { name: "B.Tech in Computer Science & Engineering", stream: "Engineering", duration: "4 Years", fees: 140000, eligibility: "JEE Main" }
    ],
    placements: {
      highestPackage: 4800000,
      averagePackage: 1380000,
      medianPackage: 1180000,
      placementRate: 92.5,
      topRecruiters: ["Oracle", "Qualcomm", "Salesforce", "ServiceNow", "Nvidia"]
    },
    reviews: [
      { rating: 4, content: "Excellent infrastructure, great labs, and highly experienced faculty.", author: "Suresh Reddy" }
    ]
  },
  // 9. AIIMS Delhi
  {
    name: "All India Institute of Medical Sciences Delhi",
    slugName: "aiims-delhi",
    location: "Ansari Nagar, New Delhi",
    city: "New Delhi",
    state: "Delhi",
    ownership: OwnershipType.GOVERNMENT,
    accreditation: "MCI Approved",
    rating: 4.9,
    established: 1956,
    website: "https://www.aiims.edu",
    logoUrl: "https://picsum.photos/seed/aiims_logo/200/200",
    images: ["https://picsum.photos/seed/aiims1/800/500"],
    description: "AIIMS Delhi is the premier medical college and public hospital in India. It is highly sought after by medical aspirants globally.",
    courses: [
      { name: "MBBS", stream: "Medical", duration: "5.5 Years", fees: 1628, eligibility: "NEET UG" },
      { name: "B.Sc. in Nursing", stream: "Medical", duration: "4 Years", fees: 1000, eligibility: "AIIMS Exam" }
    ],
    placements: {
      highestPackage: 3500000,
      averagePackage: 1800000,
      medianPackage: 1600000,
      placementRate: 99.0,
      topRecruiters: ["Fortis", "Apollo Hospitals", "Max Healthcare", "Medanta", "Research Institutes"]
    },
    reviews: [
      { rating: 5, content: "Absolute pinnacle of medical education. Extremely high clinical exposure. Fees are practically free (₹1,628 for the entire course!).", author: "Dr. Ananya Goel" }
    ]
  },
  // 10. AIIMS Jodhpur
  {
    name: "All India Institute of Medical Sciences Jodhpur",
    slugName: "aiims-jodhpur",
    location: "Basni, Jodhpur",
    city: "Jodhpur",
    state: "Rajasthan",
    ownership: OwnershipType.GOVERNMENT,
    accreditation: "MCI Approved",
    rating: 4.6,
    established: 2012,
    website: "https://www.aiimsjodhpur.edu.in",
    logoUrl: "https://picsum.photos/seed/aiimsj_logo/200/200",
    images: ["https://picsum.photos/seed/aiimsj1/800/500"],
    description: "One of the six new AIIMS established under the Pradhan Mantri Swasthya Suraksha Yojna (PMSSY) to correct regional imbalances.",
    courses: [
      { name: "MBBS", stream: "Medical", duration: "5.5 Years", fees: 5856, eligibility: "NEET UG" }
    ],
    placements: {
      highestPackage: 2800000,
      averagePackage: 1400000,
      medianPackage: 1300000,
      placementRate: 98.0,
      topRecruiters: ["Apollo Hospitals", "Government Services", "Fortis", "Manipal Hospitals"]
    },
    reviews: [
      { rating: 5, content: "Excellent new campus, state-of-the-art labs, and brilliant faculty.", author: "Dr. Vijay Bishnoi" }
    ]
  },
  // 11. IIM Ahmedabad
  {
    name: "Indian Institute of Management Ahmedabad",
    slugName: "iim-ahmedabad",
    location: "Vastrapur, Ahmedabad",
    city: "Ahmedabad",
    state: "Gujarat",
    ownership: OwnershipType.GOVERNMENT,
    accreditation: "EQUIS Accredited",
    rating: 4.9,
    established: 1961,
    website: "https://www.iima.ac.in",
    logoUrl: "https://picsum.photos/seed/iima_logo/200/200",
    images: ["https://picsum.photos/seed/iima1/800/500"],
    description: "IIM Ahmedabad is widely recognized as the top business school in India. It is famous for its iconic Louis Kahn plaza and strict academic grading.",
    courses: [
      { name: "PGP in Management (MBA)", stream: "Management", duration: "2 Years", fees: 1250000, eligibility: "CAT" },
      { name: "PGPX (Executive MBA)", stream: "Management", duration: "1 Year", fees: 3000000, eligibility: "GMAT/GRE" }
    ],
    placements: {
      highestPackage: 11500000, // 1.15 Cr
      averagePackage: 3270000,  // 32.7 LPA
      medianPackage: 3100000,   // 31 LPA
      placementRate: 100.0,
      topRecruiters: ["McKinsey", "BCG", "Bain & Co", "Goldman Sachs", "HUL", "Morgan Stanley"]
    },
    reviews: [
      { rating: 5, content: "The Harvard of the East. The case study methodology is incredibly rigorous and teaches you business on the ground.", author: "Varun Mehta" }
    ]
  },
  // 12. IIM Bangalore
  {
    name: "Indian Institute of Management Bangalore",
    slugName: "iim-bangalore",
    location: "Bannerghatta Road, Bengaluru",
    city: "Bengaluru",
    state: "Karnataka",
    ownership: OwnershipType.GOVERNMENT,
    accreditation: "EQUIS Accredited",
    rating: 4.8,
    established: 1973,
    website: "https://www.iimb.ac.in",
    logoUrl: "https://picsum.photos/seed/iimb_logo/200/200",
    images: ["https://picsum.photos/seed/iimb1/800/500"],
    description: "Located in the Tech hub of India, IIMB is highly integrated with the corporate sector and startup ecosystem.",
    courses: [
      { name: "PGP in Management (MBA)", stream: "Management", duration: "2 Years", fees: 1200000, eligibility: "CAT" }
    ],
    placements: {
      highestPackage: 9800000,
      averagePackage: 3530000, // 35.3 LPA
      medianPackage: 3300000,
      placementRate: 100.0,
      topRecruiters: ["BCG", "Bain & Co", "Goldman Sachs", "McKinsey", "Microsoft", "J.P. Morgan"]
    },
    reviews: [
      { rating: 5, content: "Beautiful stone campus with lots of greenery. Placement stats are phenomenal.", author: "Neha Shah" }
    ]
  },
  // 13. IIM Calcutta
  {
    name: "Indian Institute of Management Calcutta",
    slugName: "iim-calcutta",
    location: "Joka, Kolkata",
    city: "Kolkata",
    state: "West Bengal",
    ownership: OwnershipType.GOVERNMENT,
    accreditation: "AACSB & AMBA Accredited",
    rating: 4.8,
    established: 1961,
    website: "https://www.iimcal.ac.in",
    logoUrl: "https://picsum.photos/seed/iimc_logo/200/200",
    images: ["https://picsum.photos/seed/iimc1/800/500"],
    description: "Known as the Finance Campus of India, IIM Calcutta has a strong reputation for quantitative methods and finance.",
    courses: [
      { name: "PGP in Management (MBA)", stream: "Management", duration: "2 Years", fees: 1150000, eligibility: "CAT" }
    ],
    placements: {
      highestPackage: 11000000,
      averagePackage: 3507000, // 35 LPA
      medianPackage: 3360000,
      placementRate: 100.0,
      topRecruiters: ["Goldman Sachs", "J.P. Morgan", "Morgan Stanley", "McKinsey", "Bain", "Nomura"]
    },
    reviews: [
      { rating: 5, content: "If you love finance, Joka is the absolute paradise. Fantastic campus with 7 lakes.", author: "Abhishek Sen" }
    ]
  },
  // 14. BITS Pilani
  {
    name: "Birla Institute of Technology and Science Pilani",
    slugName: "bits-pilani",
    location: "Pilani Campus, Vidya Vihar, Pilani",
    city: "Pilani",
    state: "Rajasthan",
    ownership: OwnershipType.PRIVATE,
    accreditation: "NAAC A",
    rating: 4.6,
    established: 1964,
    website: "https://www.bits-pilani.ac.in",
    logoUrl: "https://picsum.photos/seed/bits_logo/200/200",
    images: ["https://picsum.photos/seed/bits1/800/500"],
    description: "BITS Pilani is one of the premier private engineering institutions in India. Famous for its Zero Attendance policy and strong entrepreneurship culture.",
    courses: [
      { name: "B.E. in Computer Science", stream: "Engineering", duration: "4 Years", fees: 275000, eligibility: "BITSAT" },
      { name: "B.E. in Electronics & Communication", stream: "Engineering", duration: "4 Years", fees: 275000, eligibility: "BITSAT" },
      { name: "M.Sc. in Economics (Dual Degree)", stream: "Science", duration: "5 Years", fees: 250000, eligibility: "BITSAT" }
    ],
    placements: {
      highestPackage: 6070000,
      averagePackage: 1560000,
      medianPackage: 1350000,
      placementRate: 91.8,
      topRecruiters: ["Google", "Microsoft", "Uber", "Apple", "Oracle", "Nvidia"]
    },
    reviews: [
      { rating: 5, content: "The zero attendance policy gives you freedom to pursue startups and side projects. Excellent coding culture.", author: "Kartik Somani" }
    ]
  },
  // 15. VIT Vellore
  {
    name: "Vellore Institute of Technology",
    slugName: "vit-vellore",
    location: "Katpadi, Vellore",
    city: "Vellore",
    state: "Tamil Nadu",
    ownership: OwnershipType.PRIVATE,
    accreditation: "NAAC A++",
    rating: 4.3,
    established: 1984,
    website: "https://vit.ac.in",
    logoUrl: "https://picsum.photos/seed/vit_logo/200/200",
    images: ["https://picsum.photos/seed/vit1/800/500"],
    description: "VIT Vellore is one of the largest private universities in India, known for its massive infrastructure, fully flexible credit system, and large campus placement drives.",
    courses: [
      { name: "B.Tech in Computer Science & Engineering", stream: "Engineering", duration: "4 Years", fees: 198000, eligibility: "VITEEE" },
      { name: "B.Tech in Biotechnology", stream: "Engineering", duration: "4 Years", fees: 175000, eligibility: "VITEEE" }
    ],
    placements: {
      highestPackage: 10200000, // 1.02 Cr
      averagePackage: 920000,   // 9.2 LPA
      medianPackage: 800000,
      placementRate: 88.0,
      topRecruiters: ["Microsoft", "Cognizant", "TCS", "Infosys", "Intel", "Amazon"]
    },
    reviews: [
      { rating: 4, content: "Huge campus with great amenities. Highly secure and strict rules. Placements are great but there is very high competition due to large intake.", author: "Pooja Hegde" }
    ]
  },
  // 16. SRM Chennai
  {
    name: "SRM Institute of Science and Technology Chennai",
    slugName: "srm-chennai",
    location: "Kattankulathur, Chennai",
    city: "Chennai",
    state: "Tamil Nadu",
    ownership: OwnershipType.PRIVATE,
    accreditation: "NAAC A++",
    rating: 4.1,
    established: 1985,
    website: "https://www.srmist.edu.in",
    logoUrl: "https://picsum.photos/seed/srm_logo/200/200",
    images: ["https://picsum.photos/seed/srm1/800/500"],
    description: "SRMIST is a leading private university offering courses in Engineering, Medicine, Management, and Science.",
    courses: [
      { name: "B.Tech in Computer Science", stream: "Engineering", duration: "4 Years", fees: 250000, eligibility: "SRMJEEE" }
    ],
    placements: {
      highestPackage: 4500000,
      averagePackage: 750000,
      medianPackage: 650000,
      placementRate: 85.0,
      topRecruiters: ["Amazon", "TCS", "Wipro", "Cognizant", "Capgemini"]
    },
    reviews: [
      { rating: 4, content: "Campus life is very lively, great cultural fests (Milan). High placement numbers.", author: "Abhinav Reddy" }
    ]
  },
  // 17. Manipal University
  {
    name: "Manipal Academy of Higher Education",
    slugName: "manipal-university",
    location: "Tiger Circle, Manipal",
    city: "Manipal",
    state: "Karnataka",
    ownership: OwnershipType.PRIVATE,
    accreditation: "NAAC A++",
    rating: 4.4,
    established: 1953,
    website: "https://manipal.edu",
    logoUrl: "https://picsum.photos/seed/mahe_logo/200/200",
    images: ["https://picsum.photos/seed/mahe1/800/500"],
    description: "MAHE is a highly rated private deemed university, offering world-class infrastructure and highly sought after medical and engineering courses.",
    courses: [
      { name: "B.Tech in Computer Science & Engineering", stream: "Engineering", duration: "4 Years", fees: 335000, eligibility: "MET" },
      { name: "MBBS", stream: "Medical", duration: "5.5 Years", fees: 1780000, eligibility: "NEET UG" }
    ],
    placements: {
      highestPackage: 5400000,
      averagePackage: 1250000,
      medianPackage: 1000000,
      placementRate: 90.0,
      topRecruiters: ["Microsoft", "Intel", "Amazon", "Schneider Electric", "TCS", "Accenture"]
    },
    reviews: [
      { rating: 5, content: "Manipal is a student town, campus is extremely beautiful and clean. Incredible student culture.", author: "Arnav Jain" }
    ]
  },
  // 18. Hindu College (DU)
  {
    name: "Hindu College Delhi University",
    slugName: "hindu-college-du",
    location: "University Enclave, Delhi",
    city: "Delhi",
    state: "Delhi",
    ownership: OwnershipType.GOVERNMENT,
    accreditation: "NAAC A+",
    rating: 4.5,
    established: 1899,
    website: "https://www.hinducollege.ac.in",
    logoUrl: "https://picsum.photos/seed/hindu_logo/200/200",
    images: ["https://picsum.photos/seed/hindu1/800/500"],
    description: "Hindu College is one of the oldest and most prestigious colleges in Delhi, offering courses in Arts, Commerce and Sciences.",
    courses: [
      { name: "B.A. (Hons) in Political Science", stream: "Arts", duration: "3 Years", fees: 18000, eligibility: "CUET" },
      { name: "B.Sc. (Hons) in Physics", stream: "Science", duration: "3 Years", fees: 22000, eligibility: "CUET" }
    ],
    placements: {
      highestPackage: 3600000,
      averagePackage: 840000,
      medianPackage: 700000,
      placementRate: 80.0,
      topRecruiters: ["Deloitte", "KPMG", "EY", "McKinsey & Co", "Brain & Co", "PWC"]
    },
    reviews: [
      { rating: 5, content: "Vibrant debate societies and political atmosphere. Hindu College has a massive reputation in North Campus.", author: "Pallavi Dwivedi" }
    ]
  },
  // 19. St. Stephen's College (DU)
  {
    name: "St. Stephens College Delhi University",
    slugName: "st-stephens-college-du",
    location: "University Enclave, Delhi",
    city: "Delhi",
    state: "Delhi",
    ownership: OwnershipType.GOVERNMENT,
    accreditation: "NAAC A",
    rating: 4.6,
    established: 1881,
    website: "https://www.ststephens.edu",
    logoUrl: "https://picsum.photos/seed/stephens_logo/200/200",
    images: ["https://picsum.photos/seed/stephens1/800/500"],
    description: "St. Stephen's College is a premier liberal arts and science college, widely regarded as one of the most elite institutions in India.",
    courses: [
      { name: "B.A. (Hons) in Economics", stream: "Arts", duration: "3 Years", fees: 24000, eligibility: "CUET + Interview" },
      { name: "B.Sc. (Hons) in Mathematics", stream: "Science", duration: "3 Years", fees: 26000, eligibility: "CUET + Interview" }
    ],
    placements: {
      highestPackage: 4000000,
      averagePackage: 980000,
      medianPackage: 850000,
      placementRate: 82.0,
      topRecruiters: ["McKinsey", "BCG", "Bain", "KPMG", "PWC", "Dalberg"]
    },
    reviews: [
      { rating: 5, content: "Incredible legacy, extremely refined culture. The residence life is unique.", author: "Kabir Thapar" }
    ]
  }
];

// Generate 31 more diverse colleges programmatically to make it 50
const cities = ["Pune", "Hyderabad", "Kolkata", "Indore", "Jaipur", "Lucknow", "Coimbatore", "Bhopal", "Chandigarh", "Patna", "Kochi", "Guwahati", "Ranchi", "Bhubaneswar"];
const states = ["Maharashtra", "Telangana", "West Bengal", "Madhya Pradesh", "Rajasthan", "Uttar Pradesh", "Tamil Nadu", "Madhya Pradesh", "Punjab", "Bihar", "Kerala", "Assam", "Jharkhand", "Odisha"];
const collegeTypes = ["Engineering", "Medical", "Business", "Arts", "Science"];

for (let i = 20; i <= 50; i++) {
  const cityIndex = i % cities.length;
  const typeIndex = i % collegeTypes.length;
  const name = `National Institute of ${collegeTypes[typeIndex]} Studies, ${cities[cityIndex]}`;
  const slugName = slugify(name);
  
  prominentColleges.push({
    name,
    slugName,
    location: `Phase ${i % 3 + 1}, Main Road, ${cities[cityIndex]}`,
    city: cities[cityIndex],
    state: states[cityIndex],
    ownership: i % 2 === 0 ? OwnershipType.GOVERNMENT : OwnershipType.PRIVATE,
    accreditation: i % 3 === 0 ? "NAAC A++" : i % 3 === 1 ? "NAAC A+" : "NAAC A",
    rating: Number((3.8 + (i % 10) * 0.1).toFixed(1)),
    established: 1980 + (i * 2) % 40,
    website: `https://www.nits${i}.edu.in`,
    logoUrl: `https://picsum.photos/seed/college${i}_logo/200/200`,
    images: [
      `https://picsum.photos/seed/college${i}_1/800/500`,
      `https://picsum.photos/seed/college${i}_2/800/500`
    ],
    description: `A premier institute for ${collegeTypes[typeIndex].toLowerCase()} education and research in ${cities[cityIndex]}, committed to nurturing high-quality skilled professionals since its inception.`,
    courses: [
      { name: `B.Tech in ${collegeTypes[typeIndex]} Technology`, stream: "Engineering", duration: "4 Years", fees: 110000 + (i * 1000), eligibility: "JEE Main" },
      { name: `M.Tech in ${collegeTypes[typeIndex]} Systems`, stream: "Engineering", duration: "2 Years", fees: 60000 + (i * 500), eligibility: "GATE" }
    ],
    placements: {
      highestPackage: 1500000 + (i * 100000),
      averagePackage: 600000 + (i * 20000),
      medianPackage: 500000 + (i * 15000),
      placementRate: 75.0 + (i % 20),
      topRecruiters: ["TCS", "Infosys", "Wipro", "L&T", "Cognizant"]
    },
    reviews: [
      { rating: 4, content: "Decent infrastructure and helpful faculty. Placements are solid for software fields.", author: "Deepak Kumar" },
      { rating: 3, content: "Academics are quite standard, but the campus life and clubs are good.", author: "Neha Sen" }
    ]
  });
}

async function main() {
  console.log("Starting Seeding Process...");

  // 1. Delete all existing records
  console.log("Deleting old records...");
  await prisma.review.deleteMany();
  await prisma.placement.deleteMany();
  await prisma.course.deleteMany();
  await prisma.savedCollege.deleteMany();
  await prisma.savedComparison.deleteMany();
  await prisma.college.deleteMany();
  await prisma.user.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verificationToken.deleteMany();
  console.log("Database cleared.");

  // 2. Insert Enriched Prominent Colleges
  console.log(`Seeding ${prominentColleges.length} Enriched Prominent Colleges...`);
  const seededProminentSlugs = new Set<string>();

  for (const pc of prominentColleges) {
    const slug = pc.slugName;
    seededProminentSlugs.add(slug);

    const createdCollege = await prisma.college.create({
      data: {
        name: pc.name,
        slug: slug,
        location: pc.location,
        city: pc.city,
        state: pc.state,
        ownership: pc.ownership,
        accreditation: pc.accreditation,
        rating: pc.rating,
        reviewCount: pc.reviews.length,
        feesMin: Math.min(...pc.courses.map(c => c.fees)),
        feesMax: Math.max(...pc.courses.map(c => c.fees)),
        description: pc.description,
        website: pc.website,
        established: pc.established,
        logoUrl: pc.logoUrl,
        images: pc.images,
        courses: {
          create: pc.courses.map(c => ({
            name: c.name,
            stream: c.stream,
            duration: c.duration,
            fees: c.fees,
            eligibility: c.eligibility
          }))
        },
        placements: {
          create: {
            highestPackage: pc.placements.highestPackage,
            averagePackage: pc.placements.averagePackage,
            medianPackage: pc.placements.medianPackage,
            placementRate: pc.placements.placementRate,
            topRecruiters: pc.placements.topRecruiters
          }
        },
        reviews: {
          create: pc.reviews.map(r => ({
            rating: r.rating,
            content: r.content,
            author: r.author
          }))
        }
      }
    });
  }
  console.log("Prominent colleges seeded successfully.");

  // 3. Parse colleges.csv and seed basic colleges in batches
  const csvFilePath = path.join(process.cwd(), "../colleges.csv");
  console.log(`Verifying CSV file existence at: ${csvFilePath}`);

  if (!fs.existsSync(csvFilePath)) {
    console.error("CSV file not found! Skipping batch seeding.");
    return;
  }

  console.log("Reading CSV and parsing entries...");
  const fileStream = fs.createReadStream(csvFilePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  let batch: any[] = [];
  const BATCH_SIZE = 1000;
  let totalSeeded = 0;

  for await (const line of rl) {
    lineCount++;
    // Skip header line
    if (lineCount === 1) continue;

    const row = parseCSVLine(line);
    // Columns: id,state,name,address_line1,address_line2,city,district,pin_code
    if (row.length < 3) continue;

    const csvId = row[0];
    const stateName = row[1];
    const collegeName = row[2];
    const addr1 = row[3] || "";
    const addr2 = row[4] || "";
    const cityName = row[5] || "Unknown";
    const districtName = row[6] || "";
    const pin = row[7] || "";

    const slug = `${slugify(collegeName)}-${csvId}`;

    // Skip if it's already one of our enriched prominent colleges
    const isEnriched = prominentColleges.some(pc => 
      collegeName.toLowerCase().includes(pc.slugName.replace(/-/g, " ")) || 
      collegeName.toLowerCase().includes(pc.name.toLowerCase())
    );
    if (isEnriched) continue;

    // Build address
    const fullAddress = [addr1, addr2, districtName, pin].filter(Boolean).join(", ");

    // Heuristics for ownership
    let ownership: OwnershipType = OwnershipType.PRIVATE;
    const lowerName = collegeName.toLowerCase();
    if (
      lowerName.includes("government") || 
      lowerName.includes("govt") || 
      lowerName.includes("g.e.c") || 
      lowerName.includes("gec") ||
      lowerName.includes("state") ||
      lowerName.includes("municipal") ||
      lowerName.includes("national")
    ) {
      ownership = OwnershipType.GOVERNMENT;
    }

    // Default fee ranges (realistic private vs govt ranges)
    const feesMin = ownership === OwnershipType.GOVERNMENT ? 15000 : 60000;
    const feesMax = ownership === OwnershipType.GOVERNMENT ? 45000 : 180000;
    
    // Heuristic for established year (random between 1970 and 2020)
    const established = 1970 + (parseInt(csvId) % 50);

    // Build the college database entry
    batch.push({
      id: `csv-${csvId}`,
      name: collegeName,
      slug: slug,
      location: fullAddress || cityName,
      city: cityName,
      state: stateName,
      ownership: ownership,
      accreditation: parseInt(csvId) % 10 === 0 ? "NAAC B++" : null,
      rating: parseFloat((3.0 + (parseInt(csvId) % 15) * 0.1).toFixed(1)),
      reviewCount: 0,
      feesMin: feesMin,
      feesMax: feesMax,
      established: established,
      website: null,
      logoUrl: `https://picsum.photos/seed/logo_${csvId}/100/100`,
      images: [`https://picsum.photos/seed/img_${csvId}/800/500`]
    });

    if (batch.length >= BATCH_SIZE) {
      await prisma.college.createMany({
        data: batch,
        skipDuplicates: true
      });
      totalSeeded += batch.length;
      console.log(`Seeded ${totalSeeded} basic colleges...`);
      batch = [];
    }
  }

  // Seed remaining in batch
  if (batch.length > 0) {
    await prisma.college.createMany({
      data: batch,
      skipDuplicates: true
    });
    totalSeeded += batch.length;
    console.log(`Seeded ${totalSeeded} basic colleges...`);
  }

  console.log("CSV Seeding Completed!");
  console.log(`Total Colleges in Database: ${await prisma.college.count()}`);
  console.log("Database successfully seeded! 🎉");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
