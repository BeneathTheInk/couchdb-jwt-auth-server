
export default function({test,url,username,password}) {
	test("signs in and responds with token", (t) => {
		t.fail("test ran");
		t.end();
	});
	// test("signs in and responds with application/jwt when accepted");
	// test("renews token, responding with new token");
	// test("renews token, responding with application/jwt when accepted");
	// test("signs out with token");
	// test("gets token information");
	// test("responds with unauthorized error when token is missing");
	// test("responds with invalid token error when token is invalid");
}
