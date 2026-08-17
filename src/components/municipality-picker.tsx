import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, Search } from "lucide-react";
import { supportedMunicipalities } from "../lib/municipalities";

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function MunicipalityPicker({ value, onChange }: { value: string; onChange: (municipality: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const cities = useMemo(() => {
    const term = normalized(query);
    return term ? supportedMunicipalities.filter((city) => normalized(city).includes(term)) : supportedMunicipalities;
  }, [query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    function closeOnOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function choose(city: string) {
    onChange(city);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className={`municipality-picker ${open ? "is-open" : ""}`} ref={rootRef}>
      <button className="municipality-trigger" type="button" role="combobox" aria-expanded={open} aria-controls={listId} aria-label="Escolher município" onClick={() => setOpen((current) => !current)}>
        <span className="municipality-pin"><MapPin size={20} /></span>
        <span className="municipality-current">
          <strong>{value || "Escolher município"}</strong>
          <small>{value === "Brejões" ? "Cidade principal do Hydra Agro" : value ? "Município atendido · Bahia" : "Brejões e cidades vizinhas"}</small>
        </span>
        <ChevronDown className="municipality-chevron" size={20} />
      </button>

      {open && (
        <div className="municipality-panel" id={listId} role="listbox" aria-label="Municípios atendidos">
          <label className="municipality-search"><Search size={18} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar cidade" aria-label="Pesquisar cidade" /></label>
          <div className="municipality-region-note"><MapPin size={15} /><span><strong>Atendimento regional</strong><small>Brejões e municípios vizinhos na Bahia</small></span></div>
          <div className="municipality-options">
            {cities.map((city) => (
              <button key={city} type="button" role="option" aria-selected={value === city} className={value === city ? "selected" : ""} onClick={() => choose(city)}>
                <span><strong>{city}</strong><small>{city === "Brejões" ? "Cidade principal" : "Município atendido"}</small></span>
                {value === city ? <Check size={18} /> : <span className="municipality-dot" />}
              </button>
            ))}
            {cities.length === 0 && <p>Nenhum município atendido encontrado.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
