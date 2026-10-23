export type SortBox={top:number;height:number};
/** Keep the dragged row inside the list and cross neighbouring row centres. */
export function sortPosition(boxes:SortBox[],from:number,offset:number) {
 const source=boxes[from],last=boxes[boxes.length-1];
 const y=Math.max(boxes[0].top-source.top,Math.min(last.top+last.height-source.top-source.height,offset));
 const center=source.top+source.height/2+y;
 let to=from;
 if(y>0)for(let i=from+1;i<boxes.length;i++){if(center>=boxes[i].top+boxes[i].height/2)to=i;}
 else if(y<0)for(let i=from-1;i>=0;i--){if(center<=boxes[i].top+boxes[i].height/2)to=i;}
 if(y>0&&source.top+source.height+y>=last.top+last.height-.5)to=boxes.length-1;
 if(y<0&&source.top+y<=boxes[0].top+.5)to=0;
 const gap=boxes.length>1?(boxes[1].top-boxes[0].top-boxes[0].height):0;
 const shift=source.height+gap;
 const offsets=boxes.map((_,i)=>to>from&&i>from&&i<=to?-shift:to<from&&i>=to&&i<from?shift:0);
 const landing=to>from?boxes[to].top+boxes[to].height-source.top-source.height:boxes[to].top-source.top;
 return {y,to,offsets,landing};
}
