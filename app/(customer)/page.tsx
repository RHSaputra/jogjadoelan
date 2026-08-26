"use client";

import { useEffect, useState } from "react";
import { HeroSlider } from "@/components/customer/HeroSlider";
import { KategoriSection } from "@/components/customer/KategoriSection";
import { RekomendasiSection } from "@/components/customer/RekomendasiSection";
import { PartnerSection } from "@/components/customer/PartnerSection";
import { KeunggulanSection } from "@/components/customer/KeunggulanSection";
import { InfoTokoSection } from "@/components/customer/InfoTokoSection";
import { FollowSection } from "@/components/customer/FollowSection";
import {
  getLandingAsync,
  SECTION_VIS_DEFAULT,
  type SectionVisibility,
} from "@/lib/admin-toko-master-helpers";

export default function HomePage() {
  const [vis, setVis] = useState<SectionVisibility>(SECTION_VIS_DEFAULT);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const data = await getLandingAsync();
      if (!cancelled) setVis(data.sectionVis ?? SECTION_VIS_DEFAULT);
    }

    void load();

    const sync = () => void load();
    window.addEventListener("jogjadoelan_landing_changed", sync);

    return () => {
      cancelled = true;
      window.removeEventListener("jogjadoelan_landing_changed", sync);
    };
  }, []);

  return (
    <>
      <HeroSlider />
      {vis.kategori && <KategoriSection />}
      {vis.rekomendasi && <RekomendasiSection />}
      {vis.partner && <PartnerSection />}
      {vis.keunggulan && <KeunggulanSection />}
      {vis.infoToko && <InfoTokoSection />}
      {vis.follow && <FollowSection />}
    </>
  );
}