import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveProperty } from "./actions";
import {
  operationTypeLabels,
  operationTypes,
  propertyStatusLabels,
  propertyStatuses,
  propertyTypeLabels,
} from "./property-options";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { requireOrganizationMembership } from "@/lib/organizations";

type PropertiesPageProps = {
  params: Promise<{ organizationSlug: string }>;
  searchParams: Promise<{
    operation?: string | string[];
    search?: string | string[];
    status?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PropertiesPage({
  params,
  searchParams,
}: PropertiesPageProps) {
  const userId = await requireAuthenticatedUserId();
  const { organizationSlug } = await params;
  const membership = await requireOrganizationMembership(userId, organizationSlug);

  if (!membership) {
    notFound();
  }

  const query = await searchParams;
  const search = firstValue(query.search)?.trim() ?? "";
  const status = propertyStatuses.find(
    (value) => value === firstValue(query.status),
  );
  const operation = operationTypes.find(
    (value) => value === firstValue(query.operation),
  );
  const conditions: SQL[] = [eq(properties.organizationId, membership.id)];

  if (search) {
    const searchCondition = or(
      ilike(properties.title, `%${search}%`),
      ilike(properties.reference, `%${search}%`),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  if (status) conditions.push(eq(properties.status, status));
  if (operation) conditions.push(eq(properties.operationType, operation));

  const propertyList = await db
    .select({
      id: properties.id,
      reference: properties.reference,
      title: properties.title,
      operationType: properties.operationType,
      propertyType: properties.propertyType,
      priceAmount: properties.priceAmount,
      currency: properties.currency,
      status: properties.status,
      isPublished: properties.isPublished,
      isFeatured: properties.isFeatured,
    })
    .from(properties)
    .where(and(...conditions))
    .orderBy(desc(properties.createdAt));

  const propertiesHref = `/admin/${encodeURIComponent(organizationSlug)}/properties`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-2">
          <Link className="text-sm text-muted-foreground hover:text-foreground" href={`/admin/${encodeURIComponent(organizationSlug)}`}>
            {membership.name}
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Propiedades</h1>
        </div>
        <Link className={buttonVariants()} href={`${propertiesHref}/new`}>Nueva propiedad</Link>
      </header>

      <form className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]" method="get">
        <Input aria-label="Buscar por título o referencia" name="search" placeholder="Buscar por título o referencia" defaultValue={search} />
        <NativeSelect className="w-full" aria-label="Filtrar por estado" name="status" defaultValue={status ?? ""}>
          <NativeSelectOption value="">Todos los estados</NativeSelectOption>
          {propertyStatuses.map((value) => <NativeSelectOption key={value} value={value}>{propertyStatusLabels[value]}</NativeSelectOption>)}
        </NativeSelect>
        <NativeSelect className="w-full" aria-label="Filtrar por operación" name="operation" defaultValue={operation ?? ""}>
          <NativeSelectOption value="">Todas las operaciones</NativeSelectOption>
          {operationTypes.map((value) => <NativeSelectOption key={value} value={value}>{operationTypeLabels[value]}</NativeSelectOption>)}
        </NativeSelect>
        <div className="flex gap-2">
          <Button type="submit">Filtrar</Button>
          {(search || status || operation) ? <Link className={buttonVariants({ variant: "outline" })} href={propertiesHref}>Limpiar</Link> : null}
        </div>
      </form>

      <section className="overflow-hidden rounded-xl border bg-card">
        {propertyList.length === 0 ? (
          <Empty className="min-h-48">
            <EmptyHeader>
              <EmptyTitle>No hay propiedades para mostrar</EmptyTitle>
              <EmptyDescription>
                Creá una propiedad o ajustá los filtros.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referencia</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Operación</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Publicación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {propertyList.map((property) => {
                const editHref = `${propertiesHref}/${property.id}/edit`;
                const archiveAction = archiveProperty.bind(null, organizationSlug, property.id);

                return (
                  <TableRow key={property.id}>
                    <TableCell className="font-medium">{property.reference}</TableCell>
                    <TableCell className="max-w-64 truncate">{property.title}</TableCell>
                    <TableCell>{operationTypeLabels[property.operationType]}</TableCell>
                    <TableCell>{propertyTypeLabels[property.propertyType]}</TableCell>
                    <TableCell>{formatPrice(property.priceAmount, property.currency)}</TableCell>
                    <TableCell><Badge variant={property.status === "archived" ? "outline" : "secondary"}>{propertyStatusLabels[property.status]}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Badge variant={property.isPublished ? "default" : "outline"}>{property.isPublished ? "Publicada" : "No publicada"}</Badge>
                        {property.isFeatured ? <Badge variant="secondary">Destacada</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={editHref}>Editar</Link>
                        {property.status !== "archived" ? (
                          <form action={archiveAction}>
                            <Button variant="destructive" size="sm" type="submit">Archivar</Button>
                          </form>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  );
}

function formatPrice(priceAmount: number | null, currency: "ARS" | "USD" | null) {
  if (priceAmount === null || currency === null) return "Consultar";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(priceAmount / 100);
}
