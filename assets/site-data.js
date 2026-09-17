"use strict";
const CONFIG = {
        email: "garciagg2193@gmail.com",
        // Número con lada país, sin espacios ni signos.
        whatsapp: "523411056019",
        github: "biggbackagain",
        // EmailJS: cuenta existente. Si el envío falla, se ofrece continuar por WhatsApp.
        emailjsPublicKey:  "FZKVyxIC2B2IL5BZU",
        emailjsServiceId:  "service_2gul40q",
        emailjsTemplateId: "template_gv9vyol",
      };
const certifications = [
        { title: "Django Web Framework", org: "Meta", cat: "Backend", date: "ene. 2024", id: "SE4WTFMZZB8Z", link: "https://www.coursera.org/account/accomplishments/verify/SE4WTFMZZB8Z" },
        { title: "Introduction to Databases for Back-End Development", org: "Meta", cat: "Backend", date: "nov. 2023", id: "RGSGRBD46JXP", link: "https://www.coursera.org/account/accomplishments/certificate/RGSGRBD46JXP" },
        { title: "Programming in Python", org: "Meta", cat: "Backend", date: "oct. 2023", id: "H2KPRK98WZL", link: "https://www.coursera.org/account/accomplishments/certificate/QH2KPRK98WZL" },
        { title: "Introduction to Back-End Development", org: "Meta", cat: "Backend", date: "ago. 2023", id: "WEE4LA4LBKFK", link: "https://www.coursera.org/account/accomplishments/certificate/WEE4LA4LBKFK" },
        { title: "Version Control", org: "Meta", cat: "Backend", date: "nov. 2023", id: "XXS3MFACYDZN", link: "https://www.coursera.org/account/accomplishments/certificate/XXS3MFACYDZN" },
        { title: "Python (Basics)", org: "HackerRank", cat: "Backend", date: "nov. 2023", id: "66f4ce0ed7d2f", link: "https://www.hackerrank.com/certificates/6f4ce0ed7d2f" },
        { title: "Java (Basic)", org: "HackerRank", cat: "Backend", date: "abr. 2023", id: "A61D167E96C6", link: "https://www.hackerrank.com/certificates/a61d167e96c6" },
        { title: "Python esencial", org: "LinkedIn", cat: "Backend", date: "feb. 2023", link: "https://www.linkedin.com/learning/certificates/58d2214a8c69fdc07ea04a574643440ae958509d970497ad18ff4cb8ebb25a68" },
        { title: "Los bits y bytes de las redes informáticas", org: "Google", cat: "Redes", date: "ene. 2024", id: "GX3MKT2D7MS4", link: "https://www.coursera.org/account/accomplishments/verify/GX3MKT2D7MS4" },
        { title: "CCNA Routing & Switching: Escalamiento de redes", org: "Cisco Networking Academy", cat: "Redes", date: "feb. 2021", link: "https://www.linkedin.com/posts/irangarcia93_ccna-scaling-network-certificate-activity-6774263849555230721-Y6fc/" },
        { title: "Networking Basics", org: "Cisco", cat: "Redes", date: "ene. 2023", link: "https://www.credly.com/badges/f7817efd-de8d-443a-838c-aad5392eb627/linked_in_profile" },
        { title: "Networking Devices and Initial Configuration", org: "Cisco", cat: "Redes", date: "ene. 2023", link: "https://www.credly.com/badges/d170a323-be27-4797-8182-967b5d97c8ce/linked_in_profile" },
        { title: "Network Addressing and Basic Troubleshooting", org: "Cisco", cat: "Redes", date: "ene. 2023", link: "https://www.credly.com/badges/9006b158-ad22-4d50-8bc1-95848e4753f6/linked_in_profile" },
        { title: "NDG Linux Essentials", org: "Cisco Networking Academy", cat: "Redes", date: "jul. 2021", link: "https://www.credly.com/badges/c14d2041-398f-4b1a-84ba-e0e74a2435a8/linked_in_profile" },
        { title: "Introduction to IoT", org: "Cisco", cat: "Redes", date: "mar. 2021", link: "https://www.credly.com/badges/40874c59-039f-4342-b62d-4155c3124773?source=linked_in_profile" },
        { title: "Junior Cybersecurity Analyst Career Path", org: "Cisco", cat: "Ciberseguridad", date: "ene. 2023", link: "https://www.credly.com/badges/11bc2aa3-c111-4459-8902-a50005452273/linked_in_profile" },
        { title: "Network Defense", org: "Cisco", cat: "Ciberseguridad", date: "ene. 2023", link: "https://www.credly.com/badges/b5e85f64-587c-4752-a47b-f9e6c1c1e767/linked_in_profile" },
        { title: "Endpoint Security", org: "Cisco", cat: "Ciberseguridad", date: "ene. 2023", link: "https://www.credly.com/badges/d5aef077-197f-42b8-a78c-1be7c1d9a182/linked_in_profile" },
        { title: "Cyber Threat Management", org: "Cisco", cat: "Ciberseguridad", date: "ene. 2023", link: "https://www.credly.com/badges/3bd545a3-78d3-4a69-8bad-42b27ac41aea/linked_in_profile" },
        { title: "Introduction to Cybersecurity", org: "Cisco", cat: "Ciberseguridad", date: "mar. 2021", link: "https://www.credly.com/badges/c91f2836-230e-4008-aa3c-510383adfad1?source=linked_in_profile" },
        { title: "Aspectos básicos de la asistencia técnica", org: "Google", cat: "Soporte", date: "ene. 2024", id: "Z97WD7QAB3CK" },
        { title: "Lifelong Learning", org: "CertiProf", cat: "Soporte", date: "jun. 2022" },
        { title: "Machine Learning Operations (MLOps): Getting Started", org: "Coursera", cat: "Datos e IA", date: "ene. 2021", id: "AFPA8EYZGXLB", link: "https://www.coursera.org/account/accomplishments/certificate/AFPA8EYZGXLB" },
        { title: "Data Science for Business - Level 1", org: "IBM", cat: "Datos e IA", date: "mar. 2021", link: "https://www.credly.com/badges/d541fbb5-a471-4fe4-8b0d-aa3379b79056?source=linked_in_profile" },
        { title: "Generative AI for Educators", org: "Google / Gemini", cat: "Datos e IA", date: "may. 2026" },
        { title: "EFSET English Certificate 53/100 (B2 Upper Intermediate)", org: "EF SET", cat: "Idiomas", date: "ene. 2023", link: "https://cert.efset.org/wifjEi" },
        { title: "TOEFL B1 (437-473 puntos)", org: "Universidad de Guadalajara", cat: "Idiomas", date: "sept. 2022", link: "https://www.linkedin.com/posts/irangarcia93_toefl-score-reporting-by-university-of-guadalajara-activity-7020283096189067264-YUj9/" }
      ];
