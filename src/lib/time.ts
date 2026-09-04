/** "19:00" + end "21:00" -> "19:00 - 21:00"; no end time -> just "19:00" (older games published before end times existed). */
export function formatTimeRange(time: string, endTime: string | null): string {
  return endTime ? `${time} - ${endTime}` : time;
}
