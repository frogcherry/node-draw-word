var cds = {
    O  : [],
    ok : false,
    ym : 0,
    N  : 0,
    fo : 0,
    sc : 0,
    sp : 0,
    to : 0,
    /* on mouse move */
    m_move : function(e) {
        if (!e) e = window.event;
        /* release drag outside of the window - IE only */
        if (cds.fo.sg && !cds.w3c && !e.button) { cds.m_up(); return; }
        /* vertical mouse position */
        cds.ym = e.screenY;
        /* drag scrollbar */
        if (cds.fo.sg) cds.fo.scrollTop = cds.fo.sZ + (cds.ym - cds.fo.yZ) / cds.fo.r;
    },
    /* on mouse up */
    m_up : function (e) {
        if (!e) e = window.event;
        var tg = (e.target) ? e.target : e.srcElement;
        /* clear and skin scrollbar */
        if (cds.fo) cds.fo.sb.className = (tg.className.indexOf('scrollbar') > 0) ? 'cds_scrollbar cds_scrollbar_over' : 'cds_scrollbar';
        document.onselectstart = '';
        cds.clr();
        cds.fo.sg = false;
    },
    /* clear */
    clr : function () {
        clearTimeout(cds.to);
        cds.sc = 0;
        return false;
    },
    /* refresh all scrollbars */
    refresh : function () {
        for (var i = 0, N = cds.N; i < N; i++) {
            var o = cds.O[i];
            o.v_scroll();
            o.sb.style.width = o.st.style.width = o.su.style.width = o.su.style.height = o.sd.style.width = o.sd.style.height = o.w + 'px';
            o.sb.style.height = Math.ceil(Math.max(o.w * .5, o.r * o.offsetHeight) + 1) + 'px';
        }
    },
    /* arrows scrolling loop */
    a_scroll : function () {
        if (cds.sc != 0) {
            cds.fo.scrollTop += 6 * cds.sc / cds.fo.r;
            cds.to = setTimeout(cds.a_scroll, cds.sp);
            cds.sp = 32;
        }
    },
    /* start arrows scrolling */
    m_down : function (o, s) {
        if (cds.sc == 0) {
            o.dv.sb.className = 'cds_scrollbar cds_scrollbar_pushed';
            cds.fo = o.dv;
            cds.sc = s;
            cds.sp = 400;
            cds.a_scroll();
        }
    },
    /* init script */
    init : function () {
        if (window.oper || (!window.addEventListener && !window.attachEvent)) { this.ok = false; return; }
        /* add events */
        function addEvent (o, e, f) {
            if (window.addEventListener) { o.addEventListener(e, f, false); cds.w3c = true; return true; }
            if (window.attachEvent) return o.attachEvent('on' + e, f);
            return false;
        }
        this.ok = addEvent(window.document, 'mousemove', cds.m_move);
        this.ok = addEvent(window.document, 'mouseup', cds.m_up);
        this.ok = addEvent(window, 'resize', cds.refresh);
        return this.ok;
    },
    /* add skinable scrollbar */
    add : function (id) {
        /* get div */
        var dv = document.getElementById(id);
        /* init script */
        if (!cds.ok) cds.init();
        /* return on error */
        if (!cds.ok || !dv) return false;
        /* append div function */
        function cDiv (c) {
            var o = document.createElement('div');
            o.dv = dv;
            o.className = c;
            dc.appendChild(o);
            return o;
        }
        /* clone the original div to create an empty container */
        var dc = dv.cloneNode(false);
        dc.style.overflow = "hidden";
        /* insert the container into the div's parent */
        dv.parentNode.appendChild(dc);
        /* move the original div into the container */
        dc.appendChild(dv);
        /* modify its positionning to fit into the container */
        dv.style.position = 'absolute';
        dv.style.left = dv.style.top = '0px';
        dv.style.width = dv.style.height = '100%';
        /* push div reference in array */
        cds.O[cds.N++] = dv;
        dv.sg = false;
        /* create and append skinned scrollbar HTML elements to the container, on top of the original div */
        dv.st = cDiv('cds_track');
        dv.sb = cDiv('cds_scrollbar');
        dv.su = cDiv('cds_up');
        dv.sd = cDiv('cds_down');
        /* scrollbar on mouse down */
        dv.sb.onmousedown = function (e) {
            if (!this.dv.sg) {
                if (!e) e = window.event;
                /* save active/scrollable div */
                cds.fo = this.dv;
                /* save vertical mouse and scroll position */
                this.dv.yZ = e.screenY;
                this.dv.sZ = dv.scrollTop;
                this.dv.sg = true;
                /* pushed skin */
                this.className = 'cds_scrollbar cds_scrollbar_pushed';
                document.onselectstart = function () { return false; };
            }
            return false;
        };
        /* track on mouse down */
        dv.st.onmousedown = function (e) {
            if (!e) e = window.event;
            /* save active/scrollable div */
            cds.fo = this.dv;
            /* calculate scrollbar position */
            cds.ym = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
            for (var o = this.dv, y = 0; o != null; o = o.offsetParent) y += o.offsetTop;
            this.dv.scrollTop = (cds.ym - y - (this.dv.r * this.dv.offsetHeight / 2) - this.dv.w) / this.dv.r;
            this.dv.sb.onmousedown(e);
        };
        /* arrows on mouse down */
        dv.su.onmousedown = dv.su.ondblclick = function (e) { cds.m_down(this, -1); return false; };
        dv.sd.onmousedown = dv.sd.ondblclick = function (e) { cds.m_down(this,  1); return false; }
        /* release events */
        dv.su.onmouseout = dv.su.onmouseup = cds.clr;
        dv.sd.onmouseout = dv.sd.onmouseup = cds.clr;
        /* scrollbar on mouse over skin */
        dv.sb.onmouseover = function (e) {
            if (!this.dv.sg) this.className = 'cds_scrollbar cds_scrollbar_over';
            return false;
        };
        /* scrollbar on mouse out (default) skin */
        dv.sb.onmouseout  = function (e) {
            if (!this.dv.sg) this.className = 'cds_scrollbar';
            return false;
        };
        /* scrollbar repositionning */
        dv.v_scroll = function () {
            this.r = (this.offsetHeight - 2 * this.w) / this.scrollHeight;
            this.sb.style.top = Math.floor(this.w + this.scrollTop * this.r) + 'px';
        };
        /* calculate scrollbar width */
        dv.w = dv.offsetWidth - dv.clientWidth + 1;
        /* init scroll */
        dv.v_scroll();
        cds.refresh();
        /* hook on scroll browser's event */
        dv.onscroll = dv.v_scroll;
        return dv;
    }
};
