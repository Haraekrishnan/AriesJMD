export function plannerDeletionUpdates(eventId: string, days: Record<string, any>, users: Record<string, any>) {
 const updates: Record<string, null> = {['plannerEvents/'+eventId]:null};
 for(const [dayId,block] of Object.entries(days||{})) for(const [commentId,comment] of Object.entries(block?.comments||{}) as [string,any][]) {
  if(comment?.eventId===eventId)updates['dailyPlannerComments/'+dayId+'/comments/'+commentId]=null;
 }
 for(const [userId,user] of Object.entries(users||{})) for(const field of ['dismissedPendingUpdates','delegatedReviewDismissals']) {
  for(const key of Object.keys(user?.[field]||{}))if(key.startsWith(eventId+'_') && /^\d{4}-\d{2}-\d{2}$/.test(key.slice(eventId.length+1)))updates['users/'+userId+'/'+field+'/'+key]=null;
 }
 return updates;
}
