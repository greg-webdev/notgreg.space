p=window._p||10;mx=window._mX||0;my=window._mY||0;s=window._speed||1;
n=(x,y)=>S(x*(.14+mx*.02)+t*.7+mx*.2)*C(y*(.13+my*.02)-t*.4+my*.2)+S((x-y+t*1.1)*.09)*.5+S((x+y-t)*.07)*.4;
for(i=0;i<192;i++)for(j=0;j<108;j++){a=t/(4/s)+n(i,j);x.fillStyle=R(128+127*S(a*2+mx*1.2),15+241*S(a*3+my*1.1),10+246*S(a*4));x.fillRect(p*i,p*j,p,p);}
