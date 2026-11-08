import { RoomDetailView } from "@/components/rooms/room-detail-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoomDetailView id={id} />;
}