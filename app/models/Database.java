package models;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.ResultSet;
import java.sql.SQLException;

import play.db.DB;
import play.Logger;

public class Database {
	
	public static final String STATE_INSERT = "1";
	public static final String STATE_UPDATE = "2";
	public static final String STATE_ERROR  = "3";
	
	private Connection con;
	
	public Database() {
		this.con = DB.getConnection();
	}
	
	public int insert(String json) throws SQLException {
		Logger.info("insert data: " + json);
		PreparedStatement stmt = con.prepareStatement("INSERT INTO FORM_DATA (DATA, STATUS) VALUES(?::json, ?)", Statement.RETURN_GENERATED_KEYS);
		try {
			stmt.setString(1, json);
			stmt.setString(2, STATE_INSERT);
			
			stmt.executeUpdate();
			ResultSet rs = stmt.getGeneratedKeys();
			try {
				if (rs.next()) {
					return rs.getInt(1);
				}
			} finally {
				rs.close();
			}
			return -1;
		} finally {
			stmt.close();
		}
	}
	
	public void updateStatus(int id, String state) throws SQLException {
		Logger.info("update status: " + id + ", " + state);
		PreparedStatement stmt = con.prepareStatement("UPDATE FORM_DATA SET status = ? WHERE id = ?");
		try {
			stmt.setString(1, state);
			stmt.setInt(2, id);
			
			stmt.executeUpdate();
		} finally {
			stmt.close();
		}
	}
}
