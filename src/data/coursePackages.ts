export const academicGrades = [
  "الأول الثانوي",
  "الثاني الثانوي",
  "الثالث الثانوي",
] as const;

export const academicSystems = [
  "الثانوي العام",
  "الأزهري",
  "البكالوريا",
] as const;

export const academicTerms = [
  "الفصل الدراسي الأول",
  "الفصل الدراسي الثاني",
] as const;

export type AcademicGrade = (typeof academicGrades)[number];
export type AcademicSystem = (typeof academicSystems)[number];
export type AcademicTerm = (typeof academicTerms)[number];

export interface CoursePackageTemplate {
  id: string;
  grade: AcademicGrade;
  system: AcademicSystem;
  term: AcademicTerm;
  title: string;
  priceAmount: number;
}

export const coursePackageTemplates: CoursePackageTemplate[] =
  academicGrades.flatMap((grade, gradeIndex) =>
    academicSystems.flatMap((system, systemIndex) =>
      academicTerms.map((term, termIndex) => ({
        id: `grade-${gradeIndex + 1}-system-${systemIndex + 1}-term-${termIndex + 1}`,
        grade,
        system,
        term,
        title: `English Course - ${grade} - ${system} - ${term}`,
        priceAmount: 229 + gradeIndex * 30 + systemIndex * 10 + termIndex * 5,
      })),
    ),
  );
