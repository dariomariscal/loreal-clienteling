"use client";

import { useState } from "react";
import { useBrands, type Brand } from "@/lib/hooks";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const SECTIONS = [
  { id: "segmentation", label: "Segmentación" },
  { id: "replenishment", label: "Reposición" },
  { id: "communication", label: "Comunicación" },
  { id: "features", label: "Módulos" },
  { id: "events", label: "Tipos de evento" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function ConfigPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("segmentation");
  const { data: brands = [] } = useBrands();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Configuración"
        description="Reglas de negocio y parámetros del sistema"
      />

      <div className="flex gap-6">
        {/* Sidebar navigation */}
        <nav className="w-48 shrink-0 space-y-1">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 space-y-4">
          {activeSection === "segmentation" && <SegmentationSection />}
          {activeSection === "replenishment" && <ReplenishmentSection />}
          {activeSection === "communication" && <CommunicationSection />}
          {activeSection === "features" && <FeaturesSection brands={brands} />}
          {activeSection === "events" && <EventTypesSection />}
        </div>
      </div>
    </div>
  );
}

function SegmentationSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reglas de Segmentación</CardTitle>
        <CardDescription>
          Define los umbrales para clasificar clientes automáticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Umbral VIP — Monto mínimo LTV (MXN)</label>
            <Input type="number" defaultValue="15000" />
            <p className="text-xs text-muted-foreground">Gasto acumulado mínimo para ser VIP</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Período VIP (meses)</label>
            <Input type="number" defaultValue="12" />
            <p className="text-xs text-muted-foreground">Ventana de tiempo para calcular gasto</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Días para &ldquo;En riesgo&rdquo;</label>
            <Input type="number" defaultValue="120" />
            <p className="text-xs text-muted-foreground">Días sin transacción para marcar como at_risk</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Días para &ldquo;Nueva&rdquo;</label>
            <Input type="number" defaultValue="30" />
            <p className="text-xs text-muted-foreground">Días desde registro para considerar nueva</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Transacciones mín. &ldquo;Recurrente&rdquo;</label>
            <Input type="number" defaultValue="2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Transacciones máx. &ldquo;Recurrente&rdquo;</label>
            <Input type="number" defaultValue="5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReplenishmentSection() {
  const categories = [
    { name: "Skincare - Hidratante", days: 60, reminder: 7 },
    { name: "Skincare - Sérum", days: 90, reminder: 10 },
    { name: "Makeup - Base", days: 120, reminder: 14 },
    { name: "Makeup - Máscara", days: 90, reminder: 7 },
    { name: "Fragancia", days: 180, reminder: 14 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reglas de Reposición</CardTitle>
        <CardDescription>
          Duración estimada por categoría para alertas de recompra
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Categoría</th>
                <th className="pb-2 pr-4 font-medium">Duración (días)</th>
                <th className="pb-2 font-medium">Alerta antes (días)</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.name} className="border-b border-border/50">
                  <td className="py-2.5 pr-4">{cat.name}</td>
                  <td className="py-2.5 pr-4">
                    <Input type="number" defaultValue={cat.days} className="w-20" />
                  </td>
                  <td className="py-2.5">
                    <Input type="number" defaultValue={cat.reminder} className="w-20" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function CommunicationSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reglas de Comunicación</CardTitle>
        <CardDescription>
          Límites y horarios para envío de mensajes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Máximo mensajes por clienta/semana</label>
            <Input type="number" defaultValue="3" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Canales habilitados</label>
            <div className="flex gap-2">
              <Badge variant="success">WhatsApp</Badge>
              <Badge variant="success">SMS</Badge>
              <Badge variant="success">Email</Badge>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Hora de inicio (no enviar antes)</label>
            <Input type="time" defaultValue="09:00" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Hora de fin (no enviar después)</label>
            <Input type="time" defaultValue="21:00" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FeaturesSection({ brands }: { brands: Brand[] }) {
  const modules = [
    { key: "virtualTryon", label: "Virtual Try-On" },
    { key: "samples", label: "Muestras" },
    { key: "lookbooks", label: "Lookbooks" },
    { key: "aiRecommendations", label: "Recomendaciones IA" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Módulos por Marca</CardTitle>
        <CardDescription>
          Habilita o deshabilita funcionalidades por marca
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Marca</th>
                {modules.map((m) => (
                  <th key={m.key} className="pb-2 pr-4 font-medium text-center">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id} className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-medium">{brand.displayName}</td>
                  {modules.map((m) => (
                    <td key={m.key} className="py-2.5 pr-4 text-center">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="size-4 rounded border-border accent-accent"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function EventTypesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipos de Evento</CardTitle>
        <CardDescription>
          Configuración de tipos de cita disponibles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Los tipos de evento se gestionan por marca desde la sección de{" "}
          <a href="/admin/marcas" className="text-accent underline">
            Marcas
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}
