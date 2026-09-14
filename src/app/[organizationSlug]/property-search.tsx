type PropertySearchProps = {
  organizationSlug: string;
};

const fieldClassName =
  "h-12 w-full rounded-lg border border-input bg-card px-3.5 text-[15px] text-foreground outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25";

export function PropertySearch({ organizationSlug }: PropertySearchProps) {
  return (
    <form
      action={`/${encodeURIComponent(organizationSlug)}/properties`}
      className="grid gap-4 border border-border bg-card p-5 shadow-[0_12px_36px_rgba(30,32,29,0.07)] sm:p-6 lg:grid-cols-[0.8fr_1fr_1.2fr_auto] lg:items-end lg:gap-0 lg:p-0"
      method="get"
    >
      <label className="grid gap-2 lg:border-r lg:border-border lg:px-5 lg:py-4">
        <span className="text-sm font-semibold">Operación</span>
        <select className={fieldClassName} defaultValue="sale" name="operation">
          <option value="sale">Venta</option>
          <option value="rent">Alquiler</option>
        </select>
      </label>

      <label className="grid gap-2 lg:border-r lg:border-border lg:px-5 lg:py-4">
        <span className="text-sm font-semibold">Tipo</span>
        <select className={fieldClassName} defaultValue="" name="type">
          <option value="">Todos</option>
          <option value="house">Casa</option>
          <option value="apartment">Departamento</option>
          <option value="land">Terreno</option>
          <option value="commercial">Local</option>
          <option value="office">Oficina</option>
          <option value="country_house">Quinta</option>
          <option value="garage">Cochera</option>
        </select>
      </label>

      <label className="grid gap-2 lg:px-5 lg:py-4">
        <span className="text-sm font-semibold">Ciudad</span>
        <input
          autoComplete="off"
          className={fieldClassName}
          name="city"
          placeholder="Ej. Tandil…"
          type="text"
        />
      </label>

      <button
        className="public-button min-h-12 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 lg:m-4 lg:min-h-14 lg:rounded-lg lg:px-7"
        type="submit"
      >
        Buscar propiedades
      </button>
    </form>
  );
}
