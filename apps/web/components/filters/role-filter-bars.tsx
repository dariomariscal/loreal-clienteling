"use client";

import * as React from "react";
import { EntityFilter } from "./entity-filter";
import { FilterBar } from "./filter-bar";
import { useStores } from "@/lib/hooks/use-stores";
import { useBrands } from "@/lib/hooks/use-brands";
import { useUsers } from "@/lib/hooks/use-users";
import { useBanners } from "@/lib/hooks/use-retail-groups";

/**
 * Pre-composed filter bars per role — DRY. Every report for a given role uses
 * the same set of entity filters, so we hoist the composition here. Reports
 * just render <AreaManagerFilterBar />, etc.
 *
 * If a future report needs an extra slot, override by composing <FilterBar>
 * + <EntityFilter> directly — these helpers don't lock you in.
 */

export function CounterManagerFilterBar() {
  const { data: usersPage } = useUsers({ role: "beauty_advisor", active: "true" });
  const bas = usersPage?.data;
  return (
    <FilterBar
      role="counter_manager"
      slots={{
        baUserId: (
          <EntityFilter
            filterKey="baUserId"
            placeholder="Todos los BAs"
            options={bas?.map((u) => ({ id: u.id, label: u.fullName ?? u.email ?? u.id }))}
          />
        ),
      }}
      chipLabels={{
        baUserId: (id) =>
          `BA: ${bas?.find((u) => u.id === id)?.fullName ?? id}`,
      }}
    />
  );
}

export function AreaManagerFilterBar() {
  const { data: stores } = useStores();
  const { data: brands } = useBrands();
  const { data: usersPage } = useUsers({ role: "beauty_advisor", active: "true" });
  const bas = usersPage?.data;
  const { data: banners } = useBanners();

  return (
    <FilterBar
      role="area_manager"
      slots={{
        banner: (
          <EntityFilter
            filterKey="banner"
            placeholder="Todas las franquicias"
            options={banners?.map((b) => ({ id: b.code, label: b.name }))}
          />
        ),
        storeId: (
          <EntityFilter
            filterKey="storeId"
            placeholder="Todas las tiendas"
            options={stores?.map((s) => ({ id: s.id, label: s.displayName }))}
          />
        ),
        brandId: (
          <EntityFilter
            filterKey="brandId"
            placeholder="Todas las marcas"
            options={brands?.map((b) => ({ id: b.id, label: b.displayName }))}
          />
        ),
        baUserId: (
          <EntityFilter
            filterKey="baUserId"
            placeholder="Todos los BAs"
            options={bas?.map((u) => ({ id: u.id, label: u.fullName ?? u.email ?? u.id }))}
          />
        ),
      }}
      chipLabels={{
        banner: (code) =>
          `Franquicia: ${banners?.find((b) => b.code === code)?.name ?? code}`,
        storeId: (id) =>
          `Tienda: ${stores?.find((s) => s.id === id)?.displayName ?? id}`,
        brandId: (id) =>
          `Marca: ${brands?.find((b) => b.id === id)?.displayName ?? id}`,
        baUserId: (id) =>
          `BA: ${bas?.find((u) => u.id === id)?.fullName ?? id}`,
      }}
    />
  );
}

export function NationalFilterBar() {
  const { data: stores } = useStores();
  const { data: brands } = useBrands();
  const { data: usersPage } = useUsers({ role: "beauty_advisor", active: "true" });
  const bas = usersPage?.data;
  const { data: banners } = useBanners();

  return (
    <FilterBar
      role="national_retail_manager"
      slots={{
        banner: (
          <EntityFilter
            filterKey="banner"
            placeholder="Todas las franquicias"
            options={banners?.map((b) => ({ id: b.code, label: b.name }))}
          />
        ),
        storeId: (
          <EntityFilter
            filterKey="storeId"
            placeholder="Todas las tiendas"
            options={stores?.map((s) => ({ id: s.id, label: s.displayName }))}
          />
        ),
        brandId: (
          <EntityFilter
            filterKey="brandId"
            placeholder="Todas las marcas"
            options={brands?.map((b) => ({ id: b.id, label: b.displayName }))}
          />
        ),
        baUserId: (
          <EntityFilter
            filterKey="baUserId"
            placeholder="Todos los BAs"
            options={bas?.map((u) => ({ id: u.id, label: u.fullName ?? u.email ?? u.id }))}
          />
        ),
      }}
      chipLabels={{
        banner: (code) =>
          `Franquicia: ${banners?.find((b) => b.code === code)?.name ?? code}`,
        storeId: (id) =>
          `Tienda: ${stores?.find((s) => s.id === id)?.displayName ?? id}`,
        brandId: (id) =>
          `Marca: ${brands?.find((b) => b.id === id)?.displayName ?? id}`,
        baUserId: (id) =>
          `BA: ${bas?.find((u) => u.id === id)?.fullName ?? id}`,
      }}
    />
  );
}
