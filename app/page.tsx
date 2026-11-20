import { ApartmentExperience, type ApartmentView } from "@/components/apartments/apartment-experience";

export default async function HomePage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { demo, tab } = await searchParams;
  let view: ApartmentView = "home";
  if (demo === "1") view = "demo";
  else if (tab === "research" || tab === "compare") view = tab;
  return <ApartmentExperience view={view} />;
}
