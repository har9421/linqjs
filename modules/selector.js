
define([
    'lq'
], function(lq) {
    'use strict';

    lq.select = lq.map || function (selector, context) {
        context = context || window;
        var arr = [];
        var l = this.length;
        for (var i = 0; i < l; i++)
            arr.push(selector.call(context, this[i], i, this));
        return arr;
    };

    lq.selectMany = function (selector, resSelector) {
        resSelector = resSelector || function (i, res) { return res; };
        return this.aggregate(function (a, b) {
            return a.concat(selector(b).select(function (res) { return resSelector(b, res) }));
        }, []);
    };

    lq.take = function (c) {
        return this.slice(0, c);
    };

    lq.skip = Array.prototype.slice;

    lq.first = function (predicate, def) {
        var l = this.length;
        if (!predicate) return l ? this[0] : def == null ? null : def;
        for (var i = 0; i < l; i++)
            if (predicate(this[i], i, this))
                return this[i];

        return def == null ? null : def;
    };

    lq.last = function (predicate, def) {
        var l = this.length;
        if (!predicate) return l ? this[l - 1] : def == null ? null : def;
        while (l-- > 0)
            if (predicate(this[l], l, this))
                return this[l];

        return def == null ? null : def;
    };

    lq.union = function (arr) {
        return this.concat(arr).distinct();
    };

    lq.intersect = function (arr, comparer) {
        comparer = comparer || DefaultEqualityComparer;
        return this.distinct(comparer).where(function (t) {
            return arr.contains(t, comparer);
        });
    };

    lq.except = function (arr, comparer) {
        if (!(arr instanceof Array)) arr = [arr];
        comparer = comparer || DefaultEqualityComparer;
        var l = this.length;
        var res = [];
        for (var i = 0; i < l; i++) {
            var k = arr.length;
            var t = false;
            while (k-- > 0) {
                if (comparer(this[i], arr[k]) === true) {
                    t = true;
                    break;
                }
            }
            if (!t) res.push(this[i]);
        }
        return res;
    };

    lq.distinct = function (comparer) {
        var arr = [];
        var l = this.length;
        for (var i = 0; i < l; i++) {
            if (!arr.contains(this[i], comparer))
                arr.push(this[i]);
        }
        return arr;
    };

    lq.zip = function (arr, selector) {
        return this
            .take(Math.min(this.length, arr.length))
            .select(function (t, i) {
                return selector(t, arr[i]);
            });
    };

    lq.indexOf = Array.prototype.indexOf || function (o, index) {
        var l = this.length;
        for (var i = Math.max(Math.min(index, l), 0) || 0; i < l; i++)
            if (this[i] === o) return i;
        return -1;
    };

    lq.lastIndexOf = Array.prototype.lastIndexOf || function (o, index) {
        var l = Math.max(Math.min(index || this.length, this.length), 0);
        while (l-- > 0)
            if (this[l] === o) return l;
        return -1;
    };

    lq.remove = function (item) {
        var i = this.indexOf(item);
        if (i != -1)
            this.splice(i, 1);
    };

    lq.removeAll = function (predicate) {
        var item;
        var i = 0;
        while ((item = this.first(predicate)) != null) {
            i++;
            this.remove(item);
        }

        return i;
    };

    lq.orderBy = function (selector, comparer) {
        comparer = comparer || DefaultSortComparer;
        var arr = this.slice(0);
        var fn = function (a, b) {
            return comparer(selector(a), selector(b));
        };

        arr.thenBy = function (selector, comparer) {
            comparer = comparer || DefaultSortComparer;
            return arr.orderBy(DefaultSelector, function (a, b) {
                var res = fn(a, b);
                return res === 0 ? comparer(selector(a), selector(b)) : res;
            });
        };

        arr.thenByDescending = function (selector, comparer) {
            comparer = comparer || DefaultSortComparer;
            return arr.orderBy(DefaultSelector, function (a, b) {
                var res = fn(a, b);
                return res === 0 ? -comparer(selector(a), selector(b)) : res;
            });
        };

        return arr.sort(fn);
    };

    lq.orderByDescending = function (selector, comparer) {
        comparer = comparer || DefaultSortComparer;
        return this.orderBy(selector, function (a, b) { return -comparer(a, b) });
    };

    lq.innerJoin = function (arr, outer, inner, result, comparer) {
        comparer = comparer || DefaultEqualityComparer;
        var res = [];

        this.forEach(function (t) {
            arr.where(function (u) {
                return comparer(outer(t), inner(u));
            })
            .forEach(function (u) {
                res.push(result(t, u));
            });
        });

        return res;
    };

    lq.groupJoin = function (arr, outer, inner, result, comparer) {
        comparer = comparer || DefaultEqualityComparer;
        return this
            .select(function (t) {
                var key = outer(t);
                return {
                    outer: t,
                    inner: arr.where(function (u) { return comparer(key, inner(u)); }),
                    key: key
                };
            })
            .select(function (t) {
                t.inner.key = t.key;
                return result(t.outer, t.inner);
            });
    };

    lq.groupBy = function (selector, comparer) {
        var grp = [];
        var l = this.length;
        comparer = comparer || DefaultEqualityComparer;
        selector = selector || DefaultSelector;

        for (var i = 0; i < l; i++) {
            var k = selector(this[i]);
            var g = grp.first(function (u) { return comparer(u.key, k); });

            if (!g) {
                g = [];
                g.key = k;
                grp.push(g);
            }

            g.push(this[i]);
        }
        return grp;
    };

    lq.toDictionary = function (keySelector, valueSelector) {
        var o = {};
        var l = this.length;
        while (l-- > 0) {
            var key = keySelector(this[l]);
            if (key == null || key == "") continue;
            o[key] = valueSelector(this[l]);
        }
        return o;
    };
});