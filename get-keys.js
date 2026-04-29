const http = require('http');
const data = JSON.stringify({email:'arikmertgida@gmail.com',password:'19791979aa'});
const req = http.request({hostname:'localhost',port:9000,path:'/auth/user/emailpass',method:'POST',headers:{'Content-Type':'application/json','Content-Length':data.length}}, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    const parsed = JSON.parse(body);
    const t = parsed.token;
    if (!t) { console.log('AUTH_FAIL:' + body); process.exit(1); }
    console.log('AUTH_OK');
    const r2 = http.request({hostname:'localhost',port:9000,path:'/admin/api-keys?type=publishable&limit=20',headers:{Authorization:'Bearer '+t}}, res2 => {
      let b2 = '';
      res2.on('data', c => b2 += c);
      res2.on('end', () => {
        const keys = JSON.parse(b2);
        if (keys.api_keys && keys.api_keys.length > 0) {
          keys.api_keys.forEach(k => console.log('KEY:' + k.token + '|' + k.title));
        } else {
          console.log('NO_KEYS_FOUND');
          // Create a new publishable key
          const body2 = JSON.stringify({title:'Storefront',type:'publishable'});
          const r3 = http.request({hostname:'localhost',port:9000,path:'/admin/api-keys',method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json','Content-Length':body2.length}}, res3 => {
            let b3=''; res3.on('data',c=>b3+=c);
            res3.on('end',() => { const k = JSON.parse(b3); console.log('CREATED_KEY:' + (k.api_key ? k.api_key.token : b3)); });
          });
          r3.write(body2); r3.end();
        }
      });
    });
    r2.end();
  });
});
req.write(data);
req.end();
