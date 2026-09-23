"use client";

import { Menu } from "@base-ui/react/menu";
import { ImageIcon, MoreVertical } from "lucide-react";
import Link from "next/link";

type PropertyAdminMobileRowProps = {
  archiveAction: () => Promise<void>;
  editHref: string;
  imageUrl: string | null;
  operation: string;
  price: string;
  propertyCode: string;
  status: string;
  title: string;
  location: string;
  archived: boolean;
};

export function PropertyAdminMobileRow({
  archiveAction,
  editHref,
  imageUrl,
  operation,
  price,
  propertyCode,
  status,
  title,
  location,
  archived,
}: PropertyAdminMobileRowProps) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-3 py-3">
      <Link
        aria-label={`Editar ${title}`}
        className="size-[68px] shrink-0 overflow-hidden rounded-md bg-muted text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href={editHref}
        tabIndex={-1}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Runtime-configured Supabase Storage URL.
          <img alt="" className="size-full object-cover" src={imageUrl} />
        ) : (
          <span className="flex size-full items-center justify-center" aria-hidden="true">
            <ImageIcon className="size-5" />
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link className="block truncate text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={editHref}>
          {title}
        </Link>
        <p className="truncate text-sm text-muted-foreground">{price}</p>
        <p className="truncate text-xs text-muted-foreground">{operation} · {status}</p>
        <p className="truncate text-xs text-muted-foreground">{location} · {propertyCode}</p>
      </div>

      <Menu.Root>
        <Menu.Trigger
          aria-label={`Acciones de ${title}`}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoreVertical className="size-5" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={4} className="z-50">
            <Menu.Popup className="min-w-44 rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none">
              <Menu.Item render={<Link href={editHref} />} className="flex min-h-10 cursor-default items-center rounded-sm px-3 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground">
                Editar
              </Menu.Item>
              {!archived ? (
                <Menu.Item
                  onClick={() => void archiveAction()}
                  nativeButton
                  className="rounded-sm outline-none data-[highlighted]:bg-accent"
                  render={<button type="button" />}
                >
                  Archivar
                </Menu.Item>
              ) : null}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
