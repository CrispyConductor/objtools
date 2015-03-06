"use strict";

var expect = require("chai").expect;
var objtools = require("../lib");
var ObjectMask = objtools.ObjectMask;

describe("ObjectMask", function () {

	var obj1 = {
		str1: "string",
		str2: "string2",
		num1: 1,
		num2: 2,
		nul1: null,
		nul2: null,
		undef: undefined,
		obj: {
			foo: "test",
			bar: "test2",
			baz: "test3"
		},
		arr: [{
			str1: "one",
			str2: "two"
		}, {
			str1: "three",
			str2: "four"
		}]
	};

	var mask1 = {
		str1: true,
		str2: true,
		num1: true,
		nul1: true,
		nul2: true,
		obj: {
			foo: true,
			bar: true
		},
		arr: [{
			str1: true
		}]
	};

	var mask2 = {
		str1: true,
		num2: true,
		nul2: true,
		obj: {
			_: true,
			foo: false
		},
		arr: [{
			str2: true
		}]
	};

	describe("filterObject()", function () {

		it("basic functionality", function (done) {
			obj1 = objtools.deepCopy(obj1);
			var result = undefined;
			result = new ObjectMask({
				str1: true,
				num1: true,
				nul1: true,
				obj: {
					bar: true,
					nonexist: true
				}
			}).filterObject(obj1);
			expect(result).to.deep.equal({
				str1: "string",
				num1: 1,
				nul1: null,
				obj: {
					bar: "test2"
				}
			});
			done();
		});

		it("arrays and wildcards", function (done) {
			obj1 = objtools.deepCopy(obj1);
			var result = undefined;
			result = new ObjectMask({
				obj: {
					_: true,
					bar: false
				},
				arr: [{
					str2: true
				}]
			}).filterObject(obj1);
			expect(result).to.deep.equal({
				obj: {
					foo: "test",
					baz: "test3"
				},
				arr: [{
					str2: "two"
				}, {
					str2: "four"
				}]
			});
			done();
		});

		it("getSubMask()", function (done) {
			expect(new ObjectMask({
				foo: {
					bar: {
						baz: true
					}
				}
			}).getSubMask("foo").toObject()).to.deep.equal({
				bar: {
					baz: true
				}
			});
			done();
		});

		it("checkPath()", function (done) {
			expect(new ObjectMask(mask1).checkPath("arr.8.str1")).to.be.true;
			expect(new ObjectMask(mask1).checkPath("arr.8.str2")).to.be.false;
			done();
		});

		it("addMasks()", function (done) {
			expect(ObjectMask.addMasks(new ObjectMask(mask1), new ObjectMask(mask2)).toObject()).to.deep.equal({
				str1: true,
				str2: true,
				num1: true,
				num2: true,
				nul1: true,
				nul2: true,
				obj: {
					_: true
				},
				arr: {
					_: {
						str1: true,
						str2: true
					}
				}
			});
			done();
		});

		it("andMasks()", function (done) {
			expect(ObjectMask.andMasks(new ObjectMask(mask1), new ObjectMask(mask2)).toObject()).to.deep.equal({
				str1: true,
				nul2: true,
				obj: {
					bar: true
				}
			});
			done();
		});

		it("validate()", function (done) {
			expect(new ObjectMask(mask1).validate()).to.be.true;
			expect(new ObjectMask(mask2).validate()).to.be.true;
			expect(new ObjectMask({
				foo: new Date()
			}).validate()).to.be.false;
			done();
		});

		it("getMaskedOutFields()", function (done) {
			expect(new ObjectMask(mask1).getMaskedOutFields(obj1).sort()).to.deep.equal(["num2", "undef", "obj.baz", "arr.0.str2", "arr.1.str2"].sort());
			done();
		});

		it("filterDottedObject()", function (done) {
			var dottedObj = objtools.collapseToDotted(obj1);
			var filtered = new ObjectMask(mask2).filterDottedObject(dottedObj);
			expect(filtered).to.deep.equal({
				str1: "string",
				num2: 2,
				nul2: null,
				"obj.bar": "test2",
				"obj.baz": "test3",
				"arr.0.str2": "two",
				"arr.1.str2": "four"
			});
			done();
		});

		it("getDottedMaskedOutFields()", function (done) {
			var dottedObj = objtools.collapseToDotted(obj1);
			var fields = new ObjectMask(mask1).getDottedMaskedOutFields(dottedObj);
			expect(fields).to.deep.equal(["num2", "undef", "obj.baz", "arr.0.str2", "arr.1.str2"]);
			done();
		});

		it("checkFields()", function (done) {
			var mask = new ObjectMask(mask1);
			expect(mask.checkFields({ str1: 5 })).to.be.true;
			expect(mask.checkFields({ num2: 5 })).to.be.false;
			expect(mask.checkFields({ obj: { foo: 5 } })).to.be.true;
			expect(mask.checkFields({ obj: { baz: 5 } })).to.be.false;
			done();
		});

		it("checkDottedFields()", function (done) {
			var mask = new ObjectMask(mask1);
			expect(mask.checkDottedFields({ "obj.foo": 5 })).to.be.true;
			expect(mask.checkDottedFields({ "obj.baz": 5 })).to.be.false;
			done();
		});

		it("createMaskFromFieldList()", function (done) {
			var fields = ["foo", "bar.baz", "bar.baz.biz"];
			expect(ObjectMask.createMaskFromFieldList(fields).toObject()).to.deep.equal({
				foo: true,
				bar: {
					baz: true
				}
			});
			done();
		});

		it("createFilterFunc()", function (done) {
			var func = new ObjectMask(mask1).createFilterFunc();
			expect(func(obj1)).to.deep.equal({
				str1: "string",
				str2: "string2",
				num1: 1,
				nul1: null,
				nul2: null,
				obj: {
					foo: "test",
					bar: "test2"
				},
				arr: [{
					str1: "one"
				}, {
					str1: "three"
				}]
			});
			done();
		});
	});
});
//# sourceMappingURL=data:application/json;base64,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QUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQztBQUNsRSxPQUFJLEVBQUUsQ0FBQztHQUNQLENBQUMsQ0FBQzs7QUFFSCxJQUFFLENBQUMsWUFBWSxFQUFFLFVBQVMsSUFBSSxFQUFFO0FBQy9CLFNBQU0sQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUNsRyxRQUFJLEVBQUUsSUFBSTtBQUNWLFFBQUksRUFBRSxJQUFJO0FBQ1YsUUFBSSxFQUFFLElBQUk7QUFDVixRQUFJLEVBQUUsSUFBSTtBQUNWLFFBQUksRUFBRSxJQUFJO0FBQ1YsUUFBSSxFQUFFLElBQUk7QUFDVixPQUFHLEVBQUU7QUFDSixNQUFDLEVBQUUsSUFBSTtLQUNQO0FBQ0QsT0FBRyxFQUFFO0FBQ0osTUFBQyxFQUFFO0FBQ0YsVUFBSSxFQUFFLElBQUk7QUFDVixVQUFJLEVBQUUsSUFBSTtNQUNWO0tBQ0Q7SUFDRCxDQUFDLENBQUM7QUFDSCxPQUFJLEVBQUUsQ0FBQztHQUNQLENBQUMsQ0FBQzs7QUFFSCxJQUFFLENBQUMsWUFBWSxFQUFFLFVBQVMsSUFBSSxFQUFFO0FBQy9CLFNBQU0sQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUNsRyxRQUFJLEVBQUUsSUFBSTtBQUNWLFFBQUksRUFBRSxJQUFJO0FBQ1YsT0FBRyxFQUFFO0FBQ0osUUFBRyxFQUFFLElBQUk7S0FDVDtJQUNELENBQUMsQ0FBQztBQUNILE9BQUksRUFBRSxDQUFDO0dBQ1AsQ0FBQyxDQUFDOztBQUVILElBQUUsQ0FBQyxZQUFZ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QUUsQ0FBQyxvQkFBb0IsRUFBRSxVQUFTLElBQUksRUFBRTtBQUN2QyxPQUFJLElBQUksR0FBRyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0FBQ3BELFNBQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUNoQyxRQUFJLEVBQUUsUUFBUTtBQUNkLFFBQUksRUFBRSxTQUFTO0FBQ2YsUUFBSSxFQUFFLENBQUM7QUFDUCxRQUFJLEVBQUUsSUFBSTtBQUNWLFFBQUksRUFBRSxJQUFJO0FBQ1YsT0FBRyxFQUFFO0FBQ0osUUFBRyxFQUFFLE1BQU07QUFDWCxRQUFHLEVBQUUsT0FBTztLQUNaO0FBQ0QsT0FBRyxFQUFFLENBQ0o7QUFDQyxTQUFJLEVBQUUsS0FBSztLQUNYLEVBQ0Q7QUFDQyxTQUFJLEVBQUUsT0FBTztLQUNiLENBQ0Q7SUFDRCxDQUFDLENBQUM7QUFDSCxPQUFJLEVBQUUsQ0FBQztHQUNQLENBQUMsQ0FBQztFQUVILENBQUMsQ0FBQztDQUVILENBQUMsQ0FBQyIsImZpbGUiOiJ0ZXN0L29iamVjdC1tYXNrLmpzIiwic291cmNlc0NvbnRlbnQiOlsibGV0IGV4cGVjdCA9IHJlcXVpcmUoJ2NoYWknKS5leHBlY3Q7XG5sZXQgb2JqdG9vbHMgPSByZXF1aXJlKCcuLi9saWInKTtcbmxldCBPYmplY3RNYXNrID0gb2JqdG9vbHMuT2JqZWN0TWFzaztcblxuZGVzY3JpYmUoJ09iamVjdE1hc2snLCBmdW5jdGlvbigpIHtcblxuXHRsZXQgb2JqMSA9IHtcblx0XHRzdHIxOiAnc3RyaW5nJyxcblx0XHRzdHIyOiAnc3RyaW5nMicsXG5cdFx0bnVtMTogMSxcblx0XHRudW0yOiAyLFxuXHRcdG51bDE6IG51bGwsXG5cdFx0bnVsMjogbnVsbCxcblx0XHR1bmRlZjogdW5kZWZpbmVkLFxuXHRcdG9iajoge1xuXHRcdFx0Zm9vOiAndGVzdCcsXG5cdFx0XHRiYXI6ICd0ZXN0MicsXG5cdFx0XHRiYXo6ICd0ZXN0Mydcblx0XHR9LFxuXHRcdGFycjogW1xuXHRcdFx0e1xuXHRcdFx0XHRzdHIxOiAnb25lJyxcblx0XHRcdFx0c3RyMjogJ3R3bydcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdHN0cjE6ICd0aHJlZScsXG5cdFx0XHRcdHN0cjI6ICdmb3VyJ1xuXHRcdFx0fVxuXHRcdF1cblx0fTtcblxuXHRsZXQgbWFzazEgPSB7XG5cdFx0c3RyMTogdHJ1ZSxcblx0XHRzdHIyOiB0cnVlLFxuXHRcdG51bTE6IHRydWUsXG5cdFx0bnVsMTogdHJ1ZSxcblx0XHRudWwyOiB0cnVlLFxuXHRcdG9iajoge1xuXHRcdFx0Zm9vOiB0cnVlLFxuXHRcdFx0YmFyOiB0cnVlXG5cdFx0fSxcblx0XHRhcnI6IFtcblx0XHRcdHtcblx0XHRcdFx0c3RyMTogdHJ1ZVxuXHRcdFx0fVxuXHRcdF1cblx0fTtcblxuXHRsZXQgbWFzazIgPSB7XG5cdFx0c3RyMTogdHJ1ZSxcblx0XHRudW0yOiB0cnVlLFxuXHRcdG51bDI6IHRydWUsXG5cdFx0b2JqOiB7XG5cdFx0XHRfOiB0cnVlLFxuXHRcdFx0Zm9vOiBmYWxzZVxuXHRcdH0sXG5cdFx0YXJyOiBbXG5cdFx0XHR7XG5cdFx0XHRcdHN0cjI6IHRydWVcblx0XHRcdH1cblx0XHRdXG5cdH07XG5cblx0ZGVzY3JpYmUoJ2ZpbHRlck9iamVjdCgpJywgZnVuY3Rpb24oKSB7XG5cblx0XHRpdCgnYmFzaWMgZnVuY3Rpb25hbGl0eScsIGZ1bmN0aW9uKGRvbmUpIHtcblx0XHRcdG9iajEgPSBvYmp0b29scy5kZWVwQ29weShvYmoxKTtcblx0XHRcdGxldCByZXN1bHQ7XG5cdFx0XHRyZXN1bHQgPSBuZXcgT2JqZWN0TWFzayh7XG5cdFx0XHRcdHN0cjE6IHRydWUsXG5cdFx0XHRcdG51bTE6IHRydWUsXG5cdFx0XHRcdG51bDE6IHRydWUsXG5cdFx0XHRcdG9iajoge1xuXHRcdFx0XHRcdGJhcjogdHJ1ZSxcblx0XHRcdFx0XHRub25leGlzdDogdHJ1ZVxuXHRcdFx0XHR9XG5cdFx0XHR9KS5maWx0ZXJPYmplY3Qob2JqMSk7XG5cdFx0XHRleHBlY3QocmVzdWx0KS50by5kZWVwLmVxdWFsKHtcblx0XHRcdFx0c3RyMTogJ3N0cmluZycsXG5cdFx0XHRcdG51bTE6IDEsXG5cdFx0XHRcdG51bDE6IG51bGwsXG5cdFx0XHRcdG9iajoge1xuXHRcdFx0XHRcdGJhcjogJ3Rlc3QyJ1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdGRvbmUoKTtcblx0XHR9KTtcblxuXHRcdGl0KCdhcnJheXMgYW5kIHdpbGRjYXJkcycsIGZ1bmN0aW9uKGRvbmUpIHtcblx0XHRcdG9iajEgPSBvYmp0b29scy5kZWVwQ29weShvYmoxKTtcblx0XHRcdGxldCByZXN1bHQ7XG5cdFx0XHRyZXN1bHQgPSBuZXcgT2JqZWN0TWFzayh7XG5cdFx0XHRcdG9iajoge1xuXHRcdFx0XHRcdF86IHRydWUsXG5cdFx0XHRcdFx0YmFyOiBmYWxzZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRhcnI6IFtcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRzdHIyOiB0cnVlXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdXG5cdFx0XHR9KS5maWx0ZXJPYmplY3Qob2JqMSk7XG5cdFx0XHRleHBlY3QocmVzdWx0KS50by5kZWVwLmVxdWFsKHtcblx0XHRcdFx0b2JqOiB7XG5cdFx0XHRcdFx0Zm9vOiAndGVzdCcsXG5cdFx0XHRcdFx0YmF6OiAndGVzdDMnXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGFycjogW1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHN0cjI6ICd0d28nXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRzdHIyOiAnZm91cidcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdH0pO1xuXHRcdFx0ZG9uZSgpO1xuXHRcdH0pO1xuXG5cdFx0aXQoJ2dldFN1Yk1hc2soKScsIGZ1bmN0aW9uKGRvbmUpIHtcblx0XHRcdGV4cGVjdChuZXcgT2JqZWN0TWFzayh7XG5cdFx0XHRcdGZvbzoge1xuXHRcdFx0XHRcdGJhcjoge1xuXHRcdFx0XHRcdFx0YmF6OiB0cnVlXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KS5nZXRTdWJNYXNrKCdmb28nKS50b09iamVjdCgpKS50by5kZWVwLmVxdWFsKHtcblx0XHRcdFx0YmFyOiB7XG5cdFx0XHRcdFx0YmF6OiB0cnVlXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0ZG9uZSgpO1xuXHRcdH0pO1xuXG5cdFx0aXQoJ2NoZWNrUGF0aCgpJywgZnVuY3Rpb24oZG9uZSkge1xuXHRcdFx0ZXhwZWN0KG5ldyBPYmplY3RNYXNrKG1hc2sxKS5jaGVja1BhdGgoJ2Fyci44LnN0cjEnKSkudG8uYmUudHJ1ZTtcblx0XHRcdGV4cGVjdChuZXcgT2JqZWN0TWFzayhtYXNrMSkuY2hlY2tQYXRoKCdhcnIuOC5zdHIyJykpLnRvLmJlLmZhbHNlO1xuXHRcdFx0ZG9uZSgpO1xuXHRcdH0pO1xuXG5cdFx0aXQoJ2FkZE1hc2tzKCknLCBmdW5jdGlvbihkb25lKSB7XG5cdFx0XHRleHBlY3QoT2JqZWN0TWFzay5hZGRNYXNrcyhuZXcgT2JqZWN0TWFzayhtYXNrMSksIG5ldyBPYmplY3RNYXNrKG1hc2syKSkudG9PYmplY3QoKSkudG8uZGVlcC5lcXVhbCh7XG5cdFx0XHRcdHN0cjE6IHRydWUsXG5cdFx0XHRcdHN0cjI6IHRydWUsXG5cdFx0XHRcdG51bTE6IHRydWUsXG5cdFx0XHRcdG51bTI6IHRydWUsXG5cdFx0XHRcdG51bDE6IHRydWUsXG5cdFx0XHRcdG51bDI6IHRydWUsXG5cdFx0XHRcdG9iajoge1xuXHRcdFx0XHRcdF86IHRydWVcblx0XHRcdFx0fSxcblx0XHRcdFx0YXJyOiB7XG5cdFx0XHRcdFx0Xzoge1xuXHRcdFx0XHRcdFx0c3RyMTogdHJ1ZSxcblx0XHRcdFx0XHRcdHN0cjI6IHRydWVcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0ZG9uZSgpO1xuXHRcdH0pO1xuXG5cdFx0aXQoJ2FuZE1hc2tzKCknLCBmdW5jdGlvbihkb25lKSB7XG5cdFx0XHRleHBlY3QoT2JqZWN0TWFzay5hbmRNYXNrcyhuZXcgT2JqZWN0TWFzayhtYXNrMSksIG5ldyBPYmplY3RNYXNrKG1hc2syKSkudG9PYmplY3QoKSkudG8uZGVlcC5lcXVhbCh7XG5cdFx0XHRcdHN0cjE6IHRydWUsXG5cdFx0XHRcdG51bDI6IHRydWUsXG5cdFx0XHRcdG9iajoge1xuXHRcdFx0XHRcdGJhcjogdHJ1ZVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdGRvbmUoKTtcblx0XHR9KTtcblxuXHRcdGl0KCd2YWxpZGF0ZSgpJywgZnVuY3Rpb24oZG9uZSkge1xuXHRcdFx0ZXhwZWN0KG5ldyBPYmplY3RNYXNrKG1hc2sxKS52YWxpZGF0ZSgpKS50by5iZS50cnVlO1xuXHRcdFx0ZXhwZWN0KG5ldyBPYmplY3RNYXNrKG1hc2syKS52YWxpZGF0ZSgpKS50by5iZS50cnVlO1xuXHRcdFx0ZXhwZWN0KG5ldyBPYmplY3RNYXNrKHtcblx0XHRcdFx0Zm9vOiBuZXcgRGF0ZSgpXG5cdFx0XHR9KS52YWxpZGF0ZSgpKS50by5iZS5mYWxzZTtcblx0XHRcdGRvbmUoKTtcblx0XHR9KTtcblxuXHRcdGl0KCdnZXRNYXNrZWRPdXRGaWVsZHMoKScsIGZ1bmN0aW9uKGRvbmUpIHtcblx0XHRcdGV4cGVjdChuZXcgT2JqZWN0TWFzayhtYXNrMSkuZ2V0TWFza2VkT3V0RmllbGRzKG9iajEpLnNvcnQoKSkudG8uZGVlcC5lcXVhbChbXG5cdFx0XHRcdCdudW0yJyxcblx0XHRcdFx0J3VuZGVmJyxcblx0XHRcdFx0J29iai5iYXonLFxuXHRcdFx0XHQnYXJyLjAuc3RyMicsXG5cdFx0XHRcdCdhcnIuMS5zdHIyJ1xuXHRcdFx0XS5zb3J0KCkpO1xuXHRcdFx0ZG9uZSgpO1xuXHRcdH0pO1xuXG5cdFx0aXQoJ2ZpbHRlckRvdHRlZE9iamVjdCgpJywgZnVuY3Rpb24oZG9uZSkge1xuXHRcdFx0bGV0IGRvdHRlZE9iaiA9IG9ianRvb2xzLmNvbGxhcHNlVG9Eb3R0ZWQob2JqMSk7XG5cdFx0XHRsZXQgZmlsdGVyZWQgPSBuZXcgT2JqZWN0TWFzayhtYXNrMikuZmlsdGVyRG90dGVkT2JqZWN0KGRvdHRlZE9iaik7XG5cdFx0XHRleHBlY3QoZmlsdGVyZWQpLnRvLmRlZXAuZXF1YWwoe1xuXHRcdFx0XHRzdHIxOiAnc3RyaW5nJyxcblx0XHRcdFx0bnVtMjogMixcblx0XHRcdFx0bnVsMjogbnVsbCxcblx0XHRcdFx0J29iai5iYXInOiAndGVzdDInLFxuXHRcdFx0XHQnb2JqLmJheic6ICd0ZXN0MycsXG5cdFx0XHRcdCdhcnIuMC5zdHIyJzogJ3R3bycsXG5cdFx0XHRcdCdhcnIuMS5zdHIyJzogJ2ZvdXInXG5cdFx0XHR9KTtcblx0XHRcdGRvbmUoKTtcblx0XHR9KTtcblxuXHRcdGl0KCdnZXREb3R0ZWRNYXNrZWRPdXRGaWVsZHMoKScsIGZ1bmN0aW9uKGRvbmUpIHtcblx0XHRcdGxldCBkb3R0ZWRPYmogPSBvYmp0b29scy5jb2xsYXBzZVRvRG90dGVkKG9iajEpO1xuXHRcdFx0bGV0IGZpZWxkcyA9IG5ldyBPYmplY3RNYXNrKG1hc2sxKS5nZXREb3R0ZWRNYXNrZWRPdXRGaWVsZHMoZG90dGVkT2JqKTtcblx0XHRcdGV4cGVjdChmaWVsZHMpLnRvLmRlZXAuZXF1YWwoW1xuXHRcdFx0XHQnbnVtMicsXG5cdFx0XHRcdCd1bmRlZicsXG5cdFx0XHRcdCdvYmouYmF6Jyxcblx0XHRcdFx0J2Fyci4wLnN0cjInLFxuXHRcdFx0XHQnYXJyLjEuc3RyMidcblx0XHRcdF0pO1xuXHRcdFx0ZG9uZSgpO1xuXHRcdH0pO1xuXG5cdFx0aXQoJ2NoZWNrRmllbGRzKCknLCBmdW5jdGlvbihkb25lKSB7XG5cdFx0XHRsZXQgbWFzayA9IG5ldyBPYmplY3RNYXNrKG1hc2sxKTtcblx0XHRcdGV4cGVjdChtYXNrLmNoZWNrRmllbGRzKHsgc3RyMTogNSB9KSkudG8uYmUudHJ1ZTtcblx0XHRcdGV4cGVjdChtYXNrLmNoZWNrRmllbGRzKHsgbnVtMjogNSB9KSkudG8uYmUuZmFsc2U7XG5cdFx0XHRleHBlY3QobWFzay5jaGVja0ZpZWxkcyh7IG9iajogeyBmb286IDUgfSB9KSkudG8uYmUudHJ1ZTtcblx0XHRcdGV4cGVjdChtYXNrLmNoZWNrRmllbGRzKHsgb2JqOiB7IGJhejogNSB9IH0pKS50by5iZS5mYWxzZTtcblx0XHRcdGRvbmUoKTtcblx0XHR9KTtcblxuXHRcdGl0KCdjaGVja0RvdHRlZEZpZWxkcygpJywgZnVuY3Rpb24oZG9uZSkge1xuXHRcdFx0bGV0IG1hc2sgPSBuZXcgT2JqZWN0TWFzayhtYXNrMSk7XG5cdFx0XHRleHBlY3QobWFzay5jaGVja0RvdHRlZEZpZWxkcyh7ICdvYmouZm9vJzogNSB9KSkudG8uYmUudHJ1ZTtcblx0XHRcdGV4cGVjdChtYXNrLmNoZWNrRG90dGVkRmllbGRzKHsgJ29iai5iYXonOiA1IH0pKS50by5iZS5mYWxzZTtcblx0XHRcdGRvbmUoKTtcblx0XHR9KTtcblxuXHRcdGl0KCdjcmVhdGVNYXNrRnJvbUZpZWxkTGlzdCgpJywgZnVuY3Rpb24oZG9uZSkge1xuXHRcdFx0bGV0IGZpZWxkcyA9IFsgJ2ZvbycsICdiYXIuYmF6JywgJ2Jhci5iYXouYml6JyBdO1xuXHRcdFx0ZXhwZWN0KE9iamVjdE1hc2suY3JlYXRlTWFza0Zyb21GaWVsZExpc3QoZmllbGRzKS50b09iamVjdCgpKS50by5kZWVwLmVxdWFsKHtcblx0XHRcdFx0Zm9vOiB0cnVlLFxuXHRcdFx0XHRiYXI6IHtcblx0XHRcdFx0XHRiYXo6IHRydWVcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRkb25lKCk7XG5cdFx0fSk7XG5cblx0XHRpdCgnY3JlYXRlRmlsdGVyRnVuYygpJywgZnVuY3Rpb24oZG9uZSkge1xuXHRcdFx0bGV0IGZ1bmMgPSBuZXcgT2JqZWN0TWFzayhtYXNrMSkuY3JlYXRlRmlsdGVyRnVuYygpO1xuXHRcdFx0ZXhwZWN0KGZ1bmMob2JqMSkpLnRvLmRlZXAuZXF1YWwoe1xuXHRcdFx0XHRzdHIxOiAnc3RyaW5nJyxcblx0XHRcdFx0c3RyMjogJ3N0cmluZzInLFxuXHRcdFx0XHRudW0xOiAxLFxuXHRcdFx0XHRudWwxOiBudWxsLFxuXHRcdFx0XHRudWwyOiBudWxsLFxuXHRcdFx0XHRvYmo6IHtcblx0XHRcdFx0XHRmb286ICd0ZXN0Jyxcblx0XHRcdFx0XHRiYXI6ICd0ZXN0Midcblx0XHRcdFx0fSxcblx0XHRcdFx0YXJyOiBbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0c3RyMTogJ29uZSdcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHN0cjE6ICd0aHJlZSdcblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdH0pO1xuXHRcdFx0ZG9uZSgpO1xuXHRcdH0pO1xuXG5cdH0pO1xuXG59KTtcbiJdfQ==