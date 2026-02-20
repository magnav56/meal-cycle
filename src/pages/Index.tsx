import { useState } from "react";
import { PatientPanel } from "@/components/PatientPanel";
import { MealRequestPanel } from "@/components/MealRequestPanel";
import { KitchenPanel } from "@/components/KitchenPanel";
import { Users, ClipboardList, ChefHat } from "lucide-react";

const TABS = [
  { id: "patients", label: "Patient Clinical", icon: Users, color: "clinical" },
  { id: "requests", label: "Meal Requests", icon: ClipboardList, color: "meal" },
  { id: "kitchen", label: "Kitchen & Tracking", icon: ChefHat, color: "kitchen" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabId>("patients");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">MealFlow</h1>
            <p className="text-sm text-muted-foreground">Clinical Meal Request Workflow</p>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-6xl flex">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const activeClasses = {
              patients: "border-clinical text-clinical",
              requests: "border-meal text-meal",
              kitchen: "border-kitchen text-kitchen",
            }[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? activeClasses
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-6xl p-6">
        {activeTab === "patients" && <PatientPanel />}
        {activeTab === "requests" && <MealRequestPanel />}
        {activeTab === "kitchen" && <KitchenPanel />}
      </main>
    </div>
  );
}
